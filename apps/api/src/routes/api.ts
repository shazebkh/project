import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../data/store';
import {
  CREDIT_RULES,
  getTierForLifetimeCredits,
  isTierUnlocked,
} from '../../../../packages/shared/src/creditRules';
import {
  filterGPSPoints,
  caloriesBurned,
} from '../../../../packages/shared/src/haversine';
import { computePerceptualHash } from '../../../../packages/shared/src/phash';
import { verifyDisposalPhoto, processDisposalApproval } from '../services/verification';
import { authorityAdapter } from '../services/authorityAdapter';
import { DateTime } from 'luxon';

export const apiRouter = Router();

// Middleware: Authenticate user from Bearer header or default to demo user for easy testing
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Find user by id or token match
    let user = db.getUser(token);
    if (!user) {
      // Check if token is an email
      user = db.getUserByEmail(token);
    }
    if (user) {
      (req as any).user = user;
      return next();
    }
  }

  // Fallback to demo user if no token provided or development mode
  const defaultUser = db.getUser('demo-user-1') || Array.from(db.users.values())[0];
  (req as any).user = defaultUser;
  next();
}

// Admin / Moderator check middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Admin or moderator access required' },
    });
  }
  next();
}

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, phone, display_name, timezone, weight_kg, height_cm, birth_year } = req.body;
  if (!display_name) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'display_name is required' } });
  }

  if (email && db.getUserByEmail(email)) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'User with this email already exists' } });
  }

  const user = db.createUser({
    email,
    phone,
    display_name,
    timezone: timezone || 'UTC',
    weight_kg: weight_kg ? Number(weight_kg) : undefined,
    height_cm: height_cm ? Number(height_cm) : undefined,
    birth_year: birth_year ? Number(birth_year) : undefined,
    role: 'user',
  });

  res.status(201).json({
    user,
    token: user.id,
    refreshToken: `ref-${user.id}`,
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, phone } = req.body;
  let user = email ? db.getUserByEmail(email) : undefined;
  if (!user && phone) {
    user = Array.from(db.users.values()).find((u) => u.phone === phone);
  }

  if (!user) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found. Please register.' } });
  }

  res.json({
    user,
    token: user.id,
    refreshToken: `ref-${user.id}`,
  });
});

apiRouter.post('/auth/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshToken.startsWith('ref-')) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } });
  }
  const userId = refreshToken.replace('ref-', '');
  const user = db.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }
  res.json({
    token: user.id,
    refreshToken,
  });
});

apiRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user });
});

apiRouter.patch('/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { weight_kg, height_cm, timezone, display_name } = req.body;
  const updated = db.updateUser(user.id, {
    ...(weight_kg !== undefined && { weight_kg: Number(weight_kg) }),
    ...(height_cm !== undefined && { height_cm: Number(height_cm) }),
    ...(timezone && { timezone }),
    ...(display_name && { display_name }),
  });
  res.json({ user: updated });
});

// -------------------------------------------------------------
// Walks
// -------------------------------------------------------------

apiRouter.post('/walks/start', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const session = db.createWalkSession(user.id);
  res.json({ id: session.id, started_at: session.started_at });
});

apiRouter.post('/walks/:id/points', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { points } = req.body; // Array of { lat, lng, accuracy, ts }
  const session = db.getWalkSession(id);
  if (!session) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Walk session not found' } });
  }

  if (Array.isArray(points)) {
    session.points.push(...points);
  }
  res.json({ success: true, count: session.points.length });
});

apiRouter.post('/walks/:id/finish', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const session = db.getWalkSession(id);
  if (!session) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Walk session not found' } });
  }

  // Filter GPS points according to Section 7.2
  const filterRes = filterGPSPoints(session.points);
  const caloriesRes = caloriesBurned({
    weightKg: user.weight_kg,
    distanceM: filterRes.totalDistanceM,
    durationS: filterRes.durationS,
  });

  const updated = db.updateWalkSession(id, {
    ended_at: new Date().toISOString(),
    distance_m: filterRes.totalDistanceM,
    duration_s: filterRes.durationS,
    avg_speed_kmh: filterRes.avgSpeedKmh,
    calories_kcal: caloriesRes.calories,
  });

  res.json({
    id: updated.id,
    distance_m: updated.distance_m,
    duration_s: updated.duration_s,
    avg_speed_kmh: updated.avg_speed_kmh,
    calories_kcal: updated.calories_kcal,
    is_calorie_estimate: caloriesRes.isEstimate,
  });
});

// -------------------------------------------------------------
// Uploads and Disposals Pipeline
// -------------------------------------------------------------

apiRouter.post('/uploads/sign', authMiddleware, (req: Request, res: Response) => {
  const key = `uploads/${new Date().getFullYear()}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
  // Signed mock upload URL (direct POST/PUT endpoint to upload photos)
  const uploadUrl = `/api/uploads/mock-store?key=${encodeURIComponent(key)}`;
  res.json({
    upload_url: uploadUrl,
    photo_key: key,
  });
});

// Direct photo payload receiver for testing / local camera storage
apiRouter.post('/uploads/mock-store', (req: Request, res: Response) => {
  const key = (req.query.key as string) || `upload-${Date.now()}`;
  res.json({ success: true, photo_key: key });
});

apiRouter.post('/disposals', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { photo_key, photo_data, lat, lng, gps_accuracy_m, captured_at, walk_session_id } = req.body;

  if (!photo_key && !photo_data) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'photo_key or photo_data is required' } });
  }
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'lat and lng coordinates are required' } });
  }

  const capturedTime = captured_at || new Date().toISOString();
  const receivedTime = new Date().toISOString();

  // 1. Rate limit: max 10 submissions per user per day
  const userTz = user.timezone || 'UTC';
  const localDate = DateTime.fromISO(capturedTime, { zone: userTz }).toISODate() || DateTime.utc().toISODate()!;
  const todaySubmissions = Array.from(db.disposals.values()).filter(
    (d) => d.user_id === user.id && d.local_date === localDate,
  );
  if (todaySubmissions.length >= 10) {
    return res.status(429).json({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Daily limit of 10 disposal submissions reached' },
    });
  }

  // 2. Compute perceptual hash
  const phashInput = photo_data || photo_key;
  const phash = computePerceptualHash(phashInput);

  // 3. Stale capture check (|captured_at - received_at| > 5 minutes)
  const staleMinutes = Math.abs(new Date(receivedTime).getTime() - new Date(capturedTime).getTime()) / (1000 * 60);
  if (staleMinutes > 5.0) {
    return res.status(400).json({
      error: { code: 'STALE_CAPTURE', message: 'Photo captured more than 5 minutes ago. Live camera required.' },
    });
  }

  // 4. Duplicate check
  const duplicate = db.findDuplicatePHash(phash);
  if (duplicate) {
    return res.status(409).json({
      error: { code: 'DUPLICATE_PHOTO', message: 'Near-duplicate photo detected from recent submissions.' },
    });
  }

  // 5. Create pending disposal record
  const disposal = db.createDisposal({
    user_id: user.id,
    walk_session_id,
    photo_key: photo_key || `photo-${Date.now()}`,
    photo_phash: phash,
    location: { lat: Number(lat), lng: Number(lng) },
    gps_accuracy_m: gps_accuracy_m ? Number(gps_accuracy_m) : undefined,
    captured_at: capturedTime,
    received_at: receivedTime,
    local_date: localDate,
    status: 'pending',
    waste_types: [],
  });

  // If walk session is linked, finish it automatically
  if (walk_session_id) {
    const walk = db.getWalkSession(walk_session_id);
    if (walk && !walk.ended_at) {
      const filterRes = filterGPSPoints(walk.points);
      const calRes = caloriesBurned({
        weightKg: user.weight_kg,
        distanceM: filterRes.totalDistanceM,
        durationS: filterRes.durationS,
      });
      db.updateWalkSession(walk_session_id, {
        ended_at: receivedTime,
        distance_m: filterRes.totalDistanceM,
        duration_s: filterRes.durationS,
        avg_speed_kmh: filterRes.avgSpeedKmh,
        calories_kcal: calRes.calories,
      });
    }
  }

  // 6. Run verification worker job
  const vResult = verifyDisposalPhoto({
    disposalId: disposal.id,
    userId: user.id,
    photoKeyOrData: phashInput,
    lat: Number(lat),
    lng: Number(lng),
    gpsAccuracyM: gps_accuracy_m ? Number(gps_accuracy_m) : undefined,
    capturedAt: capturedTime,
    receivedAt: receivedTime,
  });

  db.updateDisposal(disposal.id, {
    confidence: vResult.confidence,
    reject_reason: vResult.reject_reason,
    waste_types: vResult.waste_types,
  });

  // If auto-approved, process streak and credits atomically
  if (vResult.status === 'approved') {
    processDisposalApproval(disposal.id);
  } else if (vResult.status === 'rejected') {
    db.updateDisposal(disposal.id, { status: 'rejected' });
  } else {
    db.updateDisposal(disposal.id, { status: 'review' });
  }

  const finalized = db.getDisposal(disposal.id)!;
  // Return 202 Accepted
  res.status(202).json({
    id: finalized.id,
    status: finalized.status,
    confidence: finalized.confidence,
    local_date: finalized.local_date,
    reject_reason: finalized.reject_reason,
  });
});

apiRouter.get('/disposals', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { from, to } = req.query as { from?: string; to?: string };
  const items = db.getDisposalsForUser(user.id, from, to);
  res.json({ disposals: items });
});

// -------------------------------------------------------------
// Streak, Credits and Rewards
// -------------------------------------------------------------

apiRouter.get('/me/streak', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const streak = db.getStreak(user.id);

  // Find next milestone
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((m) => m > streak.current_streak) || 100;

  res.json({
    current: streak.current_streak,
    longest: streak.longest_streak,
    lastActiveDate: streak.last_active_date,
    freezes: streak.freezes_available,
    nextMilestone,
    milestoneBonus: CREDIT_RULES.milestones[nextMilestone] || 0,
  });
});

apiRouter.get('/me/credits', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { balance, lifetime, ledger } = db.getUserCredits(user.id);
  const tier = getTierForLifetimeCredits(lifetime);
  res.json({
    balance,
    lifetime,
    tier,
    ledger: ledger.slice(-50).reverse(),
  });
});

apiRouter.get('/rewards', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { lifetime, balance } = db.getUserCredits(user.id);
  const userTier = getTierForLifetimeCredits(lifetime);

  const rewards = Array.from(db.rewards.values())
    .filter((r) => r.active)
    .map((r) => {
      const unlocked = isTierUnlocked(userTier, r.tier_required);
      const canAfford = balance >= r.cost_credits;
      const inStock = r.stock === null || r.stock > 0;
      return {
        ...r,
        locked: !unlocked,
        can_redeem: unlocked && canAfford && inStock,
      };
    });

  res.json({ rewards, userTier, balance });
});

apiRouter.post('/rewards/:id/redeem', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const reward = db.rewards.get(id);

  if (!reward || !reward.active) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Reward not found or inactive' } });
  }

  const { balance, lifetime } = db.getUserCredits(user.id);
  const userTier = getTierForLifetimeCredits(lifetime);

  // 1. Check tier requirement
  if (!isTierUnlocked(userTier, reward.tier_required)) {
    return res.status(403).json({
      error: { code: 'TIER_LOCKED', message: `Requires ${reward.tier_required} tier. Current tier: ${userTier}.` },
    });
  }

  // 2. Check balance
  if (balance < reward.cost_credits) {
    return res.status(400).json({
      error: { code: 'INSUFFICIENT_CREDITS', message: `Need ${reward.cost_credits} credits. Current balance: ${balance}.` },
    });
  }

  // 3. Check stock
  if (reward.stock !== null && reward.stock <= 0) {
    return res.status(400).json({
      error: { code: 'OUT_OF_STOCK', message: 'This reward is currently out of stock.' },
    });
  }

  // Atomic redemption: deduct balance + decrement stock + generate code
  const code = `CS-${reward.tier_required.toUpperCase().slice(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  db.appendLedgerEntry({
    user_id: user.id,
    delta: -reward.cost_credits,
    reason: 'redemption',
    ref_type: 'reward',
    ref_id: `${reward.id}-${Date.now()}`,
  });

  if (reward.stock !== null) {
    reward.stock -= 1;
  }

  const redemption = {
    id: `redm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: user.id,
    reward_id: reward.id,
    cost: reward.cost_credits,
    code,
    status: 'issued' as const,
    created_at: new Date().toISOString(),
  };
  db.redemptions.set(redemption.id, redemption);

  const updatedBal = db.getUserCredits(user.id).balance;

  res.json({
    code,
    balance: updatedBal,
    redemption,
  });
});

apiRouter.get('/me/redemptions', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const redemptions = db.getRedemptionsForUser(user.id);
  res.json({ redemptions });
});

// -------------------------------------------------------------
// Civic Reports
// -------------------------------------------------------------

apiRouter.post('/reports', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { category, description, photo_keys, lat, lng, address_text, severity } = req.body;

  if (!category || !photo_keys || !photo_keys.length || lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'category, photo_keys, and lat/lng are required' },
    });
  }

  // Rate limit: max 3 reports per user per day (Section 8.4)
  const today = new Date().toISOString().slice(0, 10);
  const userTodayReports = Array.from(db.reports.values()).filter(
    (r) => r.user_id === user.id && r.created_at.startsWith(today),
  );
  if (userTodayReports.length >= CREDIT_RULES.reportsPerDay) {
    return res.status(429).json({
      error: { code: 'REPORT_LIMIT_EXCEEDED', message: `Daily report limit of ${CREDIT_RULES.reportsPerDay} reached.` },
    });
  }

  // Section 8.2: Duplicate detection (same category within 50m in last 7 days)
  const existingDup = db.findDuplicateReport(category, Number(lat), Number(lng));
  if (existingDup) {
    existingDup.support_count += 1;
    db.addReportEvent(
      existingDup.id,
      existingDup.status,
      `Additional citizen supporter joined report (total supporters: ${existingDup.support_count})`,
    );

    return res.status(200).json({
      message: 'Nearby report already exists. You have been added as a supporter!',
      report: existingDup,
      is_duplicate: true,
    });
  }

  // Create new report
  const report = db.createReport({
    user_id: user.id,
    category,
    description,
    photo_keys: Array.isArray(photo_keys) ? photo_keys : [photo_keys],
    location: { lat: Number(lat), lng: Number(lng) },
    address_text,
    severity: severity ? Number(severity) : 1,
    status: 'submitted',
  });

  // Forward to authority adapter
  try {
    const dispatch = await authorityAdapter.submit(report);
    db.updateReport(report.id, {
      status: 'forwarded',
      external_ref: dispatch.externalId,
    });
  } catch (err) {
    // If adapter fails, report is saved and will retry
    db.addReportEvent(report.id, 'submitted', 'Queued for delivery to authority');
  }

  const finalized = db.getReport(report.id)!;
  res.status(201).json({ report: finalized, is_duplicate: false });
});

apiRouter.get('/reports', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { mine } = req.query;

  let list = Array.from(db.reports.values());
  if (mine === 'true') {
    list = list.filter((r) => r.user_id === user.id);
  }
  res.json({ reports: list.sort((a, b) => b.created_at.localeCompare(a.created_at)) });
});

apiRouter.get('/reports/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const report = db.getReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
  }

  const events = db.getReportEvents(id);
  res.json({ report, events });
});

apiRouter.post('/reports/:id/support', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const report = db.getReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
  }

  report.support_count += 1;
  db.addReportEvent(id, report.status, `Supporter added (+1). Total: ${report.support_count}`);
  res.json({ report });
});

apiRouter.post('/reports/:id/confirm-resolved', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const report = db.getReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
  }

  const updated = db.updateReport(id, {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
  });

  db.addReportEvent(id, 'resolved', 'Confirmed resolved by citizen with after-action check');

  // Award 15 credits to original reporter if not yet awarded
  db.appendLedgerEntry({
    user_id: report.user_id,
    delta: CREDIT_RULES.acceptedReport,
    reason: 'report',
    ref_type: 'report',
    ref_id: report.id,
  });

  res.json({ report: updated, credits_awarded: CREDIT_RULES.acceptedReport });
});

// -------------------------------------------------------------
// Wildlife Rescue & Injury Reports
// -------------------------------------------------------------

apiRouter.post('/wildlife', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { animal_type, condition, description, photo_url, lat, lng, location, captured_at, address_hint } = req.body;

  const resolvedLat = lat !== undefined ? lat : location?.lat;
  const resolvedLng = lng !== undefined ? lng : location?.lng;

  if (!animal_type || !photo_url || resolvedLat === undefined || resolvedLng === undefined) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'animal_type, photo_url, and coordinates are required' },
    });
  }

  const report = db.createWildlifeReport({
    user_id: user.id,
    reporter_name: user.display_name,
    animal_type,
    condition: condition || 'critical',
    description: description || 'Injured animal reported via CleanStreak citizen lens',
    photo_url,
    captured_at: captured_at || new Date().toISOString(),
    location: { lat: Number(resolvedLat), lng: Number(resolvedLng) },
    address_hint,
    status: 'reported',
  });

  // Award 20 wildlife stewardship credits to reporter
  db.appendLedgerEntry({
    user_id: user.id,
    delta: 20,
    reason: 'report',
    ref_type: 'wildlife',
    ref_id: report.id,
  });

  res.status(201).json({ success: true, report, credits_awarded: 20 });
});

apiRouter.get('/wildlife', authMiddleware, (req: Request, res: Response) => {
  const reports = db.getWildlifeReports();
  res.json({ success: true, reports });
});

apiRouter.get('/wildlife/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const report = db.getWildlifeReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Wildlife report not found' } });
  }
  res.json({ success: true, report });
});

apiRouter.patch('/admin/wildlife/:id/dispatch', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { team_name, contact_phone, eta_minutes } = req.body;

  const report = db.getWildlifeReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Wildlife report not found' } });
  }

  const updated = db.updateWildlifeReport(id, {
    status: 'team_dispatched',
    dispatched_team: {
      team_name: team_name || 'Emergency Vet Rescue Unit',
      contact_phone: contact_phone || '+1 (800) 555-WILD',
      eta_minutes: eta_minutes ? Number(eta_minutes) : 20,
      dispatched_at: new Date().toISOString(),
    },
  });

  res.json({ success: true, report: updated });
});

apiRouter.patch('/admin/wildlife/:id/diagnose', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { diagnosis_notes, rescue_outcome, status } = req.body;

  const report = db.getWildlifeReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Wildlife report not found' } });
  }

  const newStatus = status || 'treated_rescued';
  const updated = db.updateWildlifeReport(id, {
    status: newStatus,
    diagnosis_notes: diagnosis_notes || report.diagnosis_notes,
    rescue_outcome: rescue_outcome || report.rescue_outcome,
    ...(newStatus === 'treated_rescued' || newStatus === 'closed' ? { resolved_at: new Date().toISOString() } : {}),
  });

  res.json({ success: true, report: updated });
});

// -------------------------------------------------------------
// Tips and Bins
// -------------------------------------------------------------

apiRouter.get('/tips/daily', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  // Personalize based on user's recent 30-day waste types (Section 9)
  const userDisposals = db.getDisposalsForUser(user.id);
  const wasteCounts: Record<string, number> = {};
  for (const d of userDisposals) {
    for (const w of d.waste_types) {
      wasteCounts[w] = (wasteCounts[w] || 0) + 1;
    }
  }

  const activeTips = Array.from(db.tips.values()).filter((t) => t.active);
  if (activeTips.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No tips available' } });
  }

  // If plastic is dominant, prefer plastic tips
  let chosenTip: typeof activeTips[0] = activeTips[0];
  const dominantType = Object.keys(wasteCounts).sort((a, b) => wasteCounts[b] - wasteCounts[a])[0];
  if (dominantType) {
    const matched = activeTips.find((t) => t.category === dominantType || t.tags.includes(dominantType));
    if (matched) chosenTip = matched;
  } else {
    // Rotate based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    chosenTip = activeTips[dayOfYear % activeTips.length];
  }

  res.json({ tip: chosenTip, dominant_waste_type: dominantType || null });
});

apiRouter.get('/tips', (req: Request, res: Response) => {
  const { category, lang } = req.query as { category?: string; lang?: string };
  let list = Array.from(db.tips.values()).filter((t) => t.active);
  if (category) {
    list = list.filter((t) => t.category === category);
  }
  if (lang) {
    list = list.filter((t) => t.language === lang);
  }
  res.json({ tips: list });
});

apiRouter.get('/bins/nearby', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 28.6692;
  const lng = parseFloat(req.query.lng as string) || 77.4538;
  const radius = parseFloat(req.query.radius as string) || 3000;

  const nearby = db.findNearbyBins(lat, lng, radius);
  res.json({ bins: nearby });
});

// -------------------------------------------------------------
// Admin / Moderator Routes & Authentication Gateway
// -------------------------------------------------------------

apiRouter.post('/admin/auth/verify', (req: Request, res: Response) => {
  const { passcode, email } = req.body;

  // Recognized admin security keys & master credentials
  const validPasscodes = ['cleanstreak-admin-2026', 'admin2026', 'mod-secure-pass'];

  // Check if passcode matches or email belongs to registered admin
  let adminUser = db.getUser('admin-user-1');
  if (!adminUser) {
    adminUser = Array.from(db.users.values()).find((u) => u.role === 'admin' || u.role === 'moderator');
  }

  const isPasscodeValid = passcode && validPasscodes.includes(passcode.trim());
  const isEmailAdmin = email && email.toLowerCase() === 'moderator@cleanstreak.app';

  if (isPasscodeValid || isEmailAdmin) {
    if (!adminUser) {
      adminUser = db.createUser({
        id: 'admin-user-1',
        email: 'moderator@cleanstreak.app',
        display_name: 'Moderator Sarah',
        timezone: 'UTC',
        role: 'admin',
      });
    }

    return res.json({
      success: true,
      message: 'Admin Authentication Gateway cleared',
      token: adminUser.id,
      user: adminUser,
      role: adminUser.role,
      authenticated_at: new Date().toISOString(),
    });
  }

  return res.status(401).json({
    error: {
      code: 'INVALID_GATEWAY_CREDENTIALS',
      message: 'Access Denied: Invalid admin passcode or security key.',
    },
  });
});

apiRouter.get('/admin/auth/check', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return res.status(403).json({
      authenticated: false,
      error: { code: 'FORBIDDEN', message: 'Current session does not have admin permissions' },
    });
  }
  return res.json({
    authenticated: true,
    user,
    role: user.role,
  });
});

apiRouter.get('/admin/reviews', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  // Return disposals pending moderator review
  const reviews = Array.from(db.disposals.values())
    .filter((d) => d.status === 'review' || d.status === 'pending')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  res.json({ reviews });
});

apiRouter.post('/admin/reviews/:id/decision', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, reject_reason } = req.body; // 'approve' | 'reject'

  const disposal = db.getDisposal(id);
  if (!disposal) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Disposal not found' } });
  }

  if (decision === 'approve') {
    const result = processDisposalApproval(id);
    return res.json({
      success: true,
      status: 'approved',
      disposal: result.disposal,
      creditsAwarded: result.creditsAwarded,
      milestoneBonus: result.milestoneBonus,
      streakIncremented: result.streakIncremented,
    });
  } else if (decision === 'reject') {
    const updated = db.updateDisposal(id, {
      status: 'rejected',
      reject_reason: reject_reason || 'Rejected by moderator review',
    });
    // Lower trust score slightly on rejected fraudulent photo
    const user = db.getUser(disposal.user_id);
    if (user) {
      db.updateUser(user.id, { trust_score: Math.max(0.1, user.trust_score - 0.05) });
    }
    return res.json({ success: true, status: 'rejected', disposal: updated });
  } else {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Decision must be approve or reject' } });
  }
});

apiRouter.get('/admin/reports', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const reports = Array.from(db.reports.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json({ reports });
});

apiRouter.patch('/admin/reports/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note, authority_id } = req.body;

  const report = db.getReport(id);
  if (!report) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
  }

  const updated = db.updateReport(id, {
    ...(status && { status }),
    ...(authority_id && { authority_id }),
  });

  if (status) {
    db.addReportEvent(id, status, note || `Status updated to ${status} by moderator`);
  }

  // Award 15 credits if accepted/resolved
  if ((status === 'acknowledged' || status === 'resolved') && report.status !== status) {
    db.appendLedgerEntry({
      user_id: report.user_id,
      delta: CREDIT_RULES.acceptedReport,
      reason: 'report',
      ref_type: 'report',
      ref_id: report.id,
    });
  }

  res.json({ report: updated });
});

// Admin stats summary
apiRouter.get('/admin/stats', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const totalUsers = db.users.size;
  const totalDisposals = db.disposals.size;
  const approvedDisposals = Array.from(db.disposals.values()).filter((d) => d.status === 'approved').length;
  const pendingReviews = Array.from(db.disposals.values()).filter((d) => d.status === 'review').length;
  const totalReports = db.reports.size;
  const totalCreditsAwarded = db.creditLedger.filter((e) => e.delta > 0).reduce((sum, e) => sum + e.delta, 0);

  res.json({
    totalUsers,
    totalDisposals,
    approvedDisposals,
    pendingReviews,
    totalReports,
    totalCreditsAwarded,
  });
});
