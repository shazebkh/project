# CleanStreak: Implementation Guide

This document explains how to build CleanStreak: the data model, core algorithms, APIs, anti-fraud approach, and a phase-by-phase plan. See [`README.md`](./README.md) for the product overview.

## Contents

1. [Guiding Decisions](#1-guiding-decisions)
2. [Phased Plan](#2-phased-plan)
3. [Data Model](#3-data-model)
4. [Disposal Submission and Verification](#4-disposal-submission-and-verification)
5. [Streak Engine](#5-streak-engine)
6. [Credits and Rewards](#6-credits-and-rewards)
7. [Walk Tracking and Calories](#7-walk-tracking-and-calories)
8. [Government Reporting Module](#8-government-reporting-module)
9. [Tips Engine](#9-tips-engine)
10. [Notifications](#10-notifications)
11. [API Reference](#11-api-reference)
12. [Frontend Screens](#12-frontend-screens)
13. [Security, Privacy and Abuse Prevention](#13-security-privacy-and-abuse-prevention)
14. [Testing](#14-testing)
15. [Deployment and Monitoring](#15-deployment-and-monitoring)
16. [Success Metrics](#16-success-metrics)
17. [Risks and Open Questions](#17-risks-and-open-questions)

---

## 1. Guiding Decisions

| Decision | Choice | Reason |
|---|---|---|
| Platform first | PWA | One codebase, instant access via link, camera and GPS available. Wrap as a native app later. |
| Verification | Start with manual review plus simple rules, add ML once real photos exist | You need real data to train a good model. Do not block the MVP on ML. |
| Credits storage | Append-only ledger | Auditable, idempotent, easy to debug fraud. |
| Day boundaries | Per-user timezone | A "day" must match the user's local day, not the server's. |
| Photo capture | Live camera only, no gallery uploads | The main defence against reusing old or downloaded photos. |
| Government integration | Adapter pattern, email first | Official APIs need permissions and partnerships. Do not depend on them for launch. |

## 2. Phased Plan

Estimates assume a small team (2 to 3 developers). Adjust to your capacity.

### Phase 0: Setup (Week 1)
- Monorepo, linting, CI, Docker Compose (Postgres + PostGIS, Redis, MinIO)
- Base schema and migrations
- **Done when:** `pnpm dev` runs web and API locally, and CI passes.

### Phase 1: MVP, Capture, Streaks, Credits (Weeks 2 to 4)
- Auth (OTP or Google), profile with timezone
- Live camera capture with geolocation and signed upload to storage
- `POST /disposals` creating a `pending` record
- Admin review queue (approve or reject)
- Streak engine and credit ledger
- Timeline and streak UI
- **Done when:** a user can submit a photo, an admin approves it, and the streak and credits update correctly across day boundaries.

### Phase 2: Auto-Verification and Rewards (Weeks 5 to 7)
- Verification service (FastAPI) with rule checks, then a detector model
- Perceptual-hash duplicate detection and trust score
- Rewards catalogue, tiers, redemption flow with codes
- **Done when:** more than 70% of legitimate photos auto-approve and duplicate or reused photos are caught in testing.

### Phase 3: Walk Tracking and Calories (Weeks 8 to 9)
- Walk sessions with GPS points, noise filtering, calorie calculation
- Stats screen (daily, weekly, monthly calories and distance)
- **Done when:** a walk to a bin produces a plausible distance and calorie estimate, verified against manual measurement.

### Phase 4: Reporting (Weeks 10 to 11)
- Report submission, duplicate merging, email adapter
- Status tracking and a "resolved" confirmation by the citizen
- **Done when:** a report reaches a test authority inbox with photo and map link, and status updates show in the app.

### Phase 5: Tips, Notifications and Launch (Week 12)
- Tips library, daily tip, personalization
- Push notifications, privacy policy, terms, onboarding
- Pilot with one neighbourhood or campus
- **Done when:** the pilot group can complete all flows without help.

## 3. Data Model

PostgreSQL with PostGIS.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE,
  phone           TEXT UNIQUE,
  display_name    TEXT NOT NULL,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  weight_kg       NUMERIC(5,2),            -- optional, for calories
  height_cm       NUMERIC(5,2),            -- optional
  birth_year      INT,                     -- optional
  role            TEXT NOT NULL DEFAULT 'user',   -- user | moderator | admin
  trust_score     NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE walk_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  distance_m      NUMERIC(10,2) DEFAULT 0,
  duration_s      INT DEFAULT 0,
  avg_speed_kmh   NUMERIC(5,2),
  calories_kcal   NUMERIC(7,2),
  source          TEXT NOT NULL DEFAULT 'gps',    -- gps | pedometer
  route           GEOGRAPHY(LINESTRING, 4326)
);

CREATE TABLE disposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  walk_session_id UUID REFERENCES walk_sessions(id),
  photo_key       TEXT NOT NULL,
  photo_phash     TEXT NOT NULL,                  -- perceptual hash
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  gps_accuracy_m  NUMERIC(6,1),
  captured_at     TIMESTAMPTZ NOT NULL,           -- client time
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  local_date      DATE NOT NULL,                  -- in the user's timezone
  status          TEXT NOT NULL DEFAULT 'pending',-- pending | review | approved | rejected
  confidence      NUMERIC(4,3),
  reject_reason   TEXT,
  waste_types     TEXT[] DEFAULT '{}',            -- plastic, organic, paper, ...
  nearest_bin_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON disposals (user_id, local_date);
CREATE INDEX ON disposals USING GIST (location);
CREATE INDEX ON disposals (photo_phash);

CREATE TABLE user_streaks (
  user_id            UUID PRIMARY KEY REFERENCES users(id),
  current_streak     INT NOT NULL DEFAULT 0,
  longest_streak     INT NOT NULL DEFAULT 0,
  last_active_date   DATE,
  freezes_available  INT NOT NULL DEFAULT 0
);

CREATE TABLE credit_ledger (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES users(id),
  delta          INT NOT NULL,
  reason         TEXT NOT NULL,   -- disposal | streak_bonus | report | redemption | adjustment
  ref_type       TEXT NOT NULL,
  ref_id         TEXT NOT NULL,
  balance_after  INT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ref_type, ref_id, reason)          -- idempotency
);

CREATE TABLE rewards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  partner        TEXT,
  cost_credits   INT NOT NULL,
  tier_required  TEXT NOT NULL DEFAULT 'bronze',
  stock          INT,                         -- NULL = unlimited
  active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  reward_id   UUID NOT NULL REFERENCES rewards(id),
  cost        INT NOT NULL,
  code        TEXT,
  status      TEXT NOT NULL DEFAULT 'issued', -- issued | used | expired
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bins (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location  GEOGRAPHY(POINT, 4326) NOT NULL,
  bin_type  TEXT,                              -- general | wet | dry | recycling | hazardous
  source    TEXT NOT NULL,                     -- osm | municipal | user
  verified  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX ON bins USING GIST (location);

CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  category      TEXT NOT NULL,   -- overflowing_bin | illegal_dumping | open_burning | missing_bin | no_segregation | other
  description   TEXT,
  photo_keys    TEXT[] NOT NULL,
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text  TEXT,
  severity      INT DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'submitted', -- submitted | forwarded | acknowledged | in_progress | resolved | rejected
  duplicate_of  UUID REFERENCES reports(id),
  support_count INT NOT NULL DEFAULT 1,
  authority_id  TEXT,
  external_ref  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX ON reports USING GIST (location);

CREATE TABLE report_events (
  id         BIGSERIAL PRIMARY KEY,
  report_id  UUID NOT NULL REFERENCES reports(id),
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tips (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category  TEXT NOT NULL,        -- segregation | composting | plastic | ewaste | recycling | hazardous
  title     TEXT NOT NULL,
  body_md   TEXT NOT NULL,
  language  TEXT NOT NULL DEFAULT 'en',
  tags      TEXT[] DEFAULT '{}',
  active    BOOLEAN NOT NULL DEFAULT true
);
```

## 4. Disposal Submission and Verification

### 4.1 Client flow

1. User taps **Dispose** (optionally after starting a walk).
2. App requests camera and location permission.
3. Capture using `getUserMedia` (no file picker). Record `captured_at`, latitude, longitude and GPS accuracy.
4. Request a signed upload URL, upload the image, then call `POST /disposals`.

### 4.2 Server pipeline

```
POST /disposals
  1. Validate payload, rate limit (max 10 submissions per user per day)
  2. Compute local_date from captured_at and the user's timezone
  3. Reject if |captured_at - received_at| > 5 minutes (stale capture)
  4. Compute perceptual hash; reject if a near-identical hash exists (Hamming distance <= 6)
  5. Save record with status = pending
  6. Enqueue verification job
  7. Return 202 { id, status: "pending" }
```

**Verification job (worker):**

| Check | Method | Outcome |
|---|---|---|
| Location plausibility | GPS accuracy under 50 m; within 30 m of a known bin, or the detector finds a bin | Fail lowers confidence |
| Content check | Detector finds bin and (garbage item or hand or person) | Main confidence signal |
| Duplicate or reused photo | pHash against previous photos from all users | Reject on match |
| Metadata sanity | EXIF time (if present) close to capture time | Fail lowers confidence |
| User trust | Higher `trust_score` allows more auto-approval | Adjusts thresholds |

**Decision:**

```
confidence >= AUTO_APPROVE_THRESHOLD (0.85)   -> approved
REVIEW_THRESHOLD (0.50) <= confidence < 0.85  -> review (moderator queue)
confidence < REVIEW_THRESHOLD                 -> rejected with reason
```

On approval, the same database transaction updates the streak and writes credits to the ledger. If anything fails, nothing is committed.

### 4.3 Verification model

- **MVP:** all photos go to `review`. Moderators use keyboard shortcuts to approve or reject quickly. Save every decision as labelled training data.
- **Phase 2:** fine-tune a YOLO model (for example YOLOv8) on classes such as `dustbin`, `garbage_item`, `person_hand`. Publicly available datasets like TACO can bootstrap waste detection, but you will need your own bin photos for good accuracy.
- Track precision and recall on a held-out set. Prefer **high precision** for auto-approval (do not reward fakes); send uncertain cases to humans.
- The same model can tag `waste_types`, which feeds personalized tips.

## 5. Streak Engine

Rules:

- One approved disposal per local day keeps the streak alive.
- If the user misses days and has enough freezes, freezes are consumed automatically and the streak continues.
- Otherwise the streak resets to 1.
- Streaks are updated **only on approval**, using the disposal's `local_date`, so late reviews still count for the correct day.
- Earn 1 freeze every 10 streak days (max 2).

```ts
import { DateTime } from 'luxon';

interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null; // 'YYYY-MM-DD'
  freezes: number;
}

export function applyApprovedDisposal(
  s: StreakState,
  localDate: string,
  tz: string,
): { state: StreakState; incremented: boolean } {
  const today = DateTime.fromISO(localDate, { zone: tz }).startOf('day');

  if (!s.lastActiveDate) {
    return { state: bump({ ...s, current: 0 }, localDate), incremented: true };
  }

  const last = DateTime.fromISO(s.lastActiveDate, { zone: tz }).startOf('day');
  const gap = Math.round(today.diff(last, 'days').days);

  if (gap <= 0) return { state: s, incremented: false }; // already counted today

  if (gap === 1) return { state: bump(s, localDate), incremented: true };

  const missed = gap - 1;
  if (s.freezes >= missed) {
    return { state: bump({ ...s, freezes: s.freezes - missed }, localDate), incremented: true };
  }
  return { state: bump({ ...s, current: 0 }, localDate), incremented: true };
}

function bump(s: StreakState, localDate: string): StreakState {
  const current = s.current + 1;
  const earnedFreeze = current % 10 === 0;
  return {
    current,
    longest: Math.max(s.longest, current),
    lastActiveDate: localDate,
    freezes: Math.min(2, s.freezes + (earnedFreeze ? 1 : 0)),
  };
}
```

**Edge cases to test:** midnight boundaries, DST changes, a user changing timezone (lock `local_date` at capture time), out-of-order reviews, and two submissions on the same day.

## 6. Credits and Rewards

### 6.1 Rules as configuration

```ts
export const CREDIT_RULES = {
  firstDisposalOfDay: 10,
  extraDisposal: 2,
  extraDisposalsPerDay: 2,
  acceptedReport: 15,
  reportsPerDay: 3,
  multiplierPerWeek: 0.1,
  multiplierCap: 2.0,
  milestones: { 3: 5, 7: 20, 14: 40, 30: 100, 60: 250, 100: 500 } as Record<number, number>,
};

export const TIERS = [
  { name: 'bronze',   minLifetime: 0 },
  { name: 'silver',   minLifetime: 500 },
  { name: 'gold',     minLifetime: 1500 },
  { name: 'platinum', minLifetime: 4000 },
];
```

### 6.2 Awarding credits

```ts
function disposalCredits(streakDay: number, isFirstOfDay: boolean, extrasSoFar: number) {
  if (!isFirstOfDay) {
    return extrasSoFar < CREDIT_RULES.extraDisposalsPerDay ? CREDIT_RULES.extraDisposal : 0;
  }
  const multiplier = Math.min(
    1 + Math.floor(streakDay / 7) * CREDIT_RULES.multiplierPerWeek,
    CREDIT_RULES.multiplierCap,
  );
  return Math.round(CREDIT_RULES.firstDisposalOfDay * multiplier);
}
```

Every award is one ledger row. Use `(ref_type, ref_id, reason)` as the idempotency key so a retried job cannot award twice. Compute `balance_after` inside the transaction with a row lock on the user's latest ledger entry (or a `SELECT ... FOR UPDATE` on a balance row).

### 6.3 Redemption

```
POST /rewards/:id/redeem
  BEGIN
    lock user balance
    check tier_required <= user tier (based on lifetime earned credits)
    check balance >= cost and stock > 0
    insert ledger row (delta = -cost, reason = redemption)
    decrement stock, insert redemption with generated code
  COMMIT
```

Tier is based on **lifetime earned credits**, not current balance, so spending credits never demotes a user.

## 7. Walk Tracking and Calories

### 7.1 Flow

1. User taps **Start walk to bin**: `POST /walks/start` returns a session id.
2. The client collects location points with `watchPosition` (high accuracy) and posts them in batches every 10 to 15 seconds.
3. When the user submits the disposal photo, the walk is linked and finished automatically.
4. The server filters noise, calculates distance, duration, speed and calories, and returns them with the disposal result.

If GPS is unavailable or the walk is very short, fall back to a step-based estimate (about 0.75 m per step, adjusted by height) using the device motion API where supported.

### 7.2 Filtering GPS points

- Discard points with accuracy worse than 30 m.
- Discard points implying speed above 10 km/h (not walking) or a jump over 50 m between consecutive points.
- Ignore movement under 2 m (jitter while standing still).

### 7.3 Distance and calories

```ts
const R = 6371000; // metres
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// MET values for level walking (Compendium of Physical Activities)
export function metForSpeed(kmh: number) {
  if (kmh < 3.0) return 2.5;
  if (kmh < 4.0) return 2.8;
  if (kmh < 5.2) return 3.5;
  if (kmh < 6.0) return 4.3;
  return 5.0;
}

export function caloriesBurned(opts: {
  weightKg?: number;
  distanceM: number;
  durationS: number;
}) {
  const weight = opts.weightKg ?? 65;                // default, flagged as estimate
  const hours = opts.durationS / 3600;
  if (hours <= 0) return 0;
  const speedKmh = opts.distanceM / 1000 / hours;
  return metForSpeed(speedKmh) * weight * hours;
}
```

**Example:** 100 m in 75 seconds is about 4.8 km/h, MET 3.5, for a 70 kg user: 3.5 x 70 x (75/3600) is roughly 5.1 kcal.

**UX notes:**
- Label values as estimates.
- Emphasize cumulative stats (weekly, monthly) because single walks are small.
- If no weight is saved, show a prompt to add it for a better estimate.

## 8. Government Reporting Module

### 8.1 Flow

```
User submits report (photo + auto location + category)
        |
        v
Dedup check: same category within 50 m in the last 7 days?
   yes -> add as supporter (support_count++), link duplicate_of, notify user
   no  -> create report
        |
        v
Resolve authority from location (jurisdiction lookup)
        |
        v
Adapter.submit(report)  -> external reference saved
        |
        v
Status sync (webhook or polling) -> report_events -> push notification
        |
        v
When marked resolved: ask the reporter to confirm with an "after" photo
```

### 8.2 Duplicate detection

```sql
SELECT id FROM reports
WHERE category = $1
  AND status NOT IN ('resolved', 'rejected')
  AND created_at > now() - interval '7 days'
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, 50)
ORDER BY created_at ASC
LIMIT 1;
```

### 8.3 Authority adapters

```ts
interface AuthorityAdapter {
  submit(report: Report): Promise<{ externalId: string }>;
  fetchStatus?(externalId: string): Promise<ReportStatus>;
}
```

| Adapter | When to use |
|---|---|
| `EmailAdapter` | MVP. Sends an email to the municipal contact with photo, map link, category and description. Replies can be handled manually. |
| `PortalAdapter` | Where an official grievance system offers an API or partnership. Requires permission, so confirm terms and legality before building. |
| `WebhookAdapter` | For municipalities that want to integrate with their own system. |

Keep a table mapping jurisdictions (ward, city) to authority contacts and adapters. Start with one pilot area, and verify contact details with the authority before launch.

**Do not scrape or auto-submit to government sites without authorization.** Use official channels.

### 8.4 Abuse controls

- Maximum 3 reports per user per day.
- Credits (15) are awarded only after a report is accepted by moderation or confirmed by the authority, not on submission.
- Moderators can reject spam or false reports, and repeated abuse lowers the user's trust score.

## 9. Tips Engine

- **Content:** write tips as Markdown or JSON, loaded into the `tips` table by the seed script. Cover segregation (wet, dry, hazardous), composting, plastic reduction, e-waste, and recycling basics. Have a local waste expert review content for your region, since rules differ by city.
- **Daily tip:** choose by rotating through categories, skipping tips the user has already seen.
- **Personalization:** weight categories by the user's last 30 days of `waste_types`. Mostly plastic means more plastic reduction tips.
- **Localization:** one row per language, falling back to English.
- **Later:** short quizzes for bonus credits (3 per day), and AI-generated tips grounded in curated content, reviewed before publishing.

## 10. Notifications

| Trigger | Message | Timing |
|---|---|---|
| Daily reminder | "Time for today's dispose-and-snap." | User-chosen time |
| Streak at risk | "Your 12-day streak ends tonight." | 7 pm local, only if no approval today |
| Disposal result | Approved or rejected with reason | On decision |
| Reward unlocked | Tier up or new reward affordable | On event |
| Report update | "Your report is in progress." | On status change |

Implement with a BullMQ scheduled job per timezone bucket. Use web push (VAPID) for the PWA. Respect quiet hours and provide per-category toggles.

## 11. API Reference

All endpoints require `Authorization: Bearer <token>` unless noted. Errors use `{ "error": { "code": "...", "message": "..." } }`.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Public. Body: email or phone, display name, timezone |
| POST | `/auth/login` | Public. Returns access and refresh tokens |
| POST | `/auth/refresh` | Public |
| PATCH | `/me` | Update profile (weight, height, timezone) |

### Walks
| Method | Path | Notes |
|---|---|---|
| POST | `/walks/start` | Returns `{ id }` |
| POST | `/walks/:id/points` | Body: `[{ lat, lng, accuracy, ts }]` |
| POST | `/walks/:id/finish` | Returns distance, duration, calories |

### Disposals
| Method | Path | Notes |
|---|---|---|
| POST | `/uploads/sign` | Returns a signed upload URL and `photo_key` |
| POST | `/disposals` | Body below |
| GET | `/disposals?from=&to=` | Timeline |

```json
// POST /disposals
{
  "photo_key": "uploads/2026/10/abc123.jpg",
  "lat": 28.6692,
  "lng": 77.4538,
  "gps_accuracy_m": 8.5,
  "captured_at": "2026-10-25T08:14:03Z",
  "walk_session_id": "c1d2..."
}

// 202 response
{ "id": "f3a4...", "status": "pending" }
```

### Streak, Credits and Rewards
| Method | Path | Response |
|---|---|---|
| GET | `/me/streak` | `{ current, longest, lastActiveDate, freezes, nextMilestone }` |
| GET | `/me/credits` | `{ balance, lifetime, tier, ledger: [...] }` |
| GET | `/rewards` | Active rewards with `locked` flag by tier |
| POST | `/rewards/:id/redeem` | `{ code, balance }` |

### Reports
| Method | Path | Notes |
|---|---|---|
| POST | `/reports` | Body: category, description, photo keys, lat, lng |
| GET | `/reports?mine=true` | User's reports |
| GET | `/reports/:id` | Includes `events` timeline |
| POST | `/reports/:id/support` | "Me too" on an existing report |
| POST | `/reports/:id/confirm-resolved` | Optional after photo |

### Tips and Bins
| Method | Path |
|---|---|
| GET | `/tips/daily` |
| GET | `/tips?category=&lang=` |
| GET | `/bins/nearby?lat=&lng=&radius=` |

### Admin (role: moderator or admin)
| Method | Path |
|---|---|
| GET | `/admin/reviews` |
| POST | `/admin/reviews/:id/decision` |
| GET | `/admin/reports` |
| PATCH | `/admin/reports/:id` |
| CRUD | `/admin/rewards`, `/admin/tips` |

## 12. Frontend Screens

1. **Onboarding:** permissions, timezone, optional weight, reminder time
2. **Home:** streak flame, today's status, big "Dispose" button, daily tip
3. **Camera:** live preview, capture, retake, submit
4. **Result:** approved or pending, credits earned, calories burned, milestone animation
5. **Timeline:** calendar heatmap and photo feed
6. **Rewards:** tier progress bar, reward cards, redeemed codes
7. **Stats:** distance, calories, disposals by waste type
8. **Report:** category picker, photo, map pin, submit; list with status timelines
9. **Tips:** daily tip and library
10. **Map:** nearby bins and recent reports
11. **Profile and Settings:** notifications, privacy, data export and deletion
12. **Admin:** review queue, report triage, rewards and tips management

Design notes: large tap targets, one-handed camera flow, works on slow networks (compress images client-side to about 1 MB), clear offline message, and accessible colour contrast.

## 13. Security, Privacy and Abuse Prevention

**Security**
- Short-lived access tokens with rotating refresh tokens; hashed passwords (argon2) if you support passwords
- Input validation on every endpoint; parameterized queries only
- Rate limiting per IP and per user; signed, expiring upload URLs with size and type limits
- Role-based access for admin routes; audit log for moderation and ledger adjustments
- Secrets in environment or a secret manager, never in the repo

**Privacy**
- Explicit consent for camera and location; collect location only when needed
- Strip EXIF from stored images; blur faces in anything shown publicly
- Retention policy (for example, delete approved photos after 90 days, keep only the hash and metadata)
- Data export and account deletion
- Review applicable law (GDPR, India's DPDP Act, or local equivalents) before launch
- Parental consent flow if minors are allowed

**Anti-fraud**
- Live camera only; reject stale captures
- Perceptual hash duplicate detection across all users
- Daily caps on credits and reports
- Trust score: rises with approved submissions, falls with rejections or abuse; very low scores need manual review for everything
- Velocity checks (impossible travel between submissions), device fingerprint, and flagging of many accounts from one device
- Moderator spot checks on a random sample of auto-approved photos

**Physical safety:** show a notice not to enter unsafe areas, handle hazardous waste, or approach traffic while taking photos or reports.

## 14. Testing

| Level | Focus |
|---|---|
| Unit | Streak engine (midnight, DST, freezes, timezone change), credit calculation, calorie and distance functions, GPS filtering |
| Integration | Disposal pipeline end to end, ledger idempotency (retry a job twice, award once), redemption under concurrent requests |
| E2E (Playwright) | Register, capture (mock camera), submit, approve, see streak and credits |
| ML evaluation | Precision and recall on a held-out set; track false approvals separately |
| Load | Burst of submissions at peak hours (morning and evening) |
| Field test | Walk known distances on real phones and compare against measured distance and expected calories |

## 15. Deployment and Monitoring

- **Environments:** local (Docker Compose), staging, production
- **CI/CD:** GitHub Actions to lint, test, build images, then deploy
- **Hosting (example):** web on Vercel or similar, API and workers on a container platform, managed Postgres with PostGIS, S3 or R2 for photos, managed Redis
- **Migrations:** run automatically in the deploy pipeline with backups before production changes
- **Observability:** Sentry for errors, structured logs, Prometheus and Grafana (or hosted equivalent) for queue depth, verification latency and approval rate
- **Backups:** daily database snapshots, tested restores

## 16. Success Metrics

| Metric | Why it matters |
|---|---|
| Daily and weekly active users | Adoption |
| Day-7 and Day-30 retention | Whether the streak mechanic works |
| Average and median streak length | Habit strength |
| Auto-approval rate and false-approval rate | Verification quality |
| Fraud and duplicate rate | System integrity |
| Reports submitted, forwarded, resolved; median time to resolve | Civic impact |
| Reward redemption rate | Whether rewards feel attainable |
| Estimated waste properly disposed (disposal count) | Mission outcome |

## 17. Risks and Open Questions

| Risk | Mitigation |
|---|---|
| People fake photos for credits | Live capture, hashing, ML, caps, manual spot checks |
| Reward costs grow faster than funding | Tune credit values, seek sponsors, limit stock, use low-cost rewards like donations and badges |
| Government does not respond or has no API | Email adapter, public status page, partner with local NGOs or resident associations |
| Privacy concerns about photos and location | Minimal collection, face blur, short retention, clear consent |
| ML accuracy poor at launch | Human review first, collect labelled data, improve iteratively |
| Calories seem trivially small | Frame as cumulative, label as estimate |
| Users take risks for photos | Safety notices, no rewards for unsafe locations |

**Decisions to make before building:**
1. Target region and languages for the pilot
2. Reward sources: sponsors, partner brands, municipal tie-ups, or self-funded
3. Which authority to pilot with and the agreed reporting channel
4. Whether minors can use the app
5. Budget for moderators and ML infrastructure
