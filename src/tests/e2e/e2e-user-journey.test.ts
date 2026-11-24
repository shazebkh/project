import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../integration/app-test-helper';
import { db } from '../../../apps/api/src/data/store';

describe('CleanStreak End-to-End Civic Habit Journey (Phases 0 - 5)', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
  });

  it('verifies complete lifecycle: walk -> dispose -> streak -> redeem -> report -> confirm', async () => {
    // 1. User Registration
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'journey@cleanstreak.app',
        display_name: 'Maya Green',
        timezone: 'America/New_York',
        weight_kg: 68,
      })
      .expect(201);

    const token = regRes.body.token;
    const userId = regRes.body.user.id;
    expect(token).toBeDefined();

    // 2. Start Walk to Bin
    const walkRes = await request(app)
      .post('/api/walks/start')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const walkId = walkRes.body.id;

    // Send GPS movement points
    const now = Date.now();
    await request(app)
      .post(`/api/walks/${walkId}/points`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        points: [
          { lat: 28.6692, lng: 77.4538, accuracy: 8, ts: now },
          { lat: 28.6695, lng: 77.4538, accuracy: 8, ts: now + 30000 },
          { lat: 28.6698, lng: 77.4538, accuracy: 8, ts: now + 60000 },
        ],
      })
      .expect(200);

    // 3. Submit Disposal at Bin
    const photoData = 'data:image/jpeg;base64,' + btoa('e2e-clean-disposal-action-bin-101');
    const dispRes = await request(app)
      .post('/api/disposals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        photo_data: photoData,
        lat: 28.6692, // adjacent to bin-1
        lng: 77.4538,
        gps_accuracy_m: 8.0,
        captured_at: new Date().toISOString(),
        walk_session_id: walkId,
      })
      .expect(202);

    expect(dispRes.body.id).toBeDefined();

    // If routed to review queue (new user baseline trust), admin moderator approves it
    if (dispRes.body.status === 'review') {
      await request(app)
        .post(`/api/admin/reviews/${dispRes.body.id}/decision`)
        .set('Authorization', 'Bearer admin-user-1')
        .send({ decision: 'approve' })
        .expect(200);
    }
    const streakRes = await request(app)
      .get('/api/me/streak')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // User streak initialized
    expect(streakRes.body.current).toBeGreaterThanOrEqual(1);

    const creditsRes = await request(app)
      .get('/api/me/credits')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(creditsRes.body.balance).toBeGreaterThanOrEqual(10);

    // 5. Reward Redemption
    // Seed some credits to redeem the Bronze Eco-Warrior badge (cost: 50)
    db.appendLedgerEntry({
      user_id: userId,
      delta: 100,
      reason: 'adjustment',
      ref_type: 'bonus',
      ref_id: 'e2e-seed',
    });

    const redeemRes = await request(app)
      .post('/api/rewards/rew-1/redeem')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(redeemRes.body.code).toMatch(/^CS-BRO-/);

    // 6. Submit Civic Waste Report to Government
    const reportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'overflowing_bin',
        description: 'Corner bin overflowing onto walkway',
        photo_keys: ['uploads/e2e-bin-overflow.jpg'],
        lat: 37.7749,
        lng: -122.4194,
        severity: 2,
      })
      .expect(201);

    const reportId = reportRes.body.report.id;
    expect(reportRes.body.report.status).toBe('forwarded');

    // 7. Citizen Confirms Resolution (+15 credits)
    const confirmRes = await request(app)
      .post(`/api/reports/${reportId}/confirm-resolved`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(confirmRes.body.report.status).toBe('resolved');
    expect(confirmRes.body.credits_awarded).toBe(15);

    // 8. Daily Tip personalized
    const tipRes = await request(app)
      .get('/api/tips/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(tipRes.body.tip).toBeDefined();
    expect(tipRes.body.tip.title).toBeDefined();
  });
});
