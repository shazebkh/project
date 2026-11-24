# CleanStreak Progress Checklist

## Phase 0: Setup
- [x] Monorepo scaffold, linting, Docker Compose (Postgres+PostGIS, Redis, MinIO), .env.example, scripts [unit: setup]
- [x] Base schema, models, and shared configuration types [unit: schema]
- [x] Server running web and API locally on port 3000, CI passes [test: server-smoke]

## Phase 1: MVP, Capture, Streaks, Credits
- [x] Auth (OTP/Google/token simulation), profile with timezone, weight, role [test: e2e-user-journey.test.ts]
- [x] Live camera capture with geolocation, signed uploads, POST /disposals [test: disposals-pipeline.test.ts]
- [x] Admin review queue (GET /admin/reviews, POST /admin/reviews/:id/decision) [test: disposals-pipeline.test.ts]
- [x] Streak engine with timezone, midnight boundary, DST, freeze mechanics [test: streak.test.ts]
- [x] Append-only credit ledger with multipliers, milestone bonuses, caps, atomic idempotency [test: credits.test.ts]
- [x] Timeline, streak heatmap, and disposals feed UI [test: e2e-user-journey.test.ts]

## Phase 2: Auto-Verification and Rewards
- [x] Perceptual-hash (pHash) duplicate detection (Hamming distance <= 6) [test: phash.test.ts]
- [x] Automated verification pipeline with confidence threshold routing [test: disposals-pipeline.test.ts]
- [x] Rewards catalogue, lifetime-tier enforcement, atomic redemption flow [test: rewards-redemption.test.ts]

## Phase 3: Walk Tracking and Calories
- [x] Walk sessions (POST /walks/start, /points, /finish) with GPS tracking [test: walks.test.ts]
- [x] GPS noise filtering (accuracy < 30m, speed < 10 km/h, jitter < 2m) [test: walks-calories.test.ts]
- [x] Haversine distance and MET calorie calculation [test: walks-calories.test.ts]
- [x] Daily/weekly/monthly walk stats UI [test: walks.test.ts]

## Phase 4: Government Reporting Module
- [x] Report submission (POST /reports) with category, photo, location [test: reports.test.ts]
- [x] Duplicate report detection (same category within 50m in 7 days, support_count++) [test: reports.test.ts]
- [x] Authority email adapter & mock mailbox with status tracking [test: reports.test.ts]
- [x] Citizen resolution confirmation flow (POST /reports/:id/confirm-resolved) [test: reports.test.ts]

## Phase 5: Tips, Notifications and Launch
- [x] Waste management tips library (segregation, composting, recycling, ewaste) [test: e2e-user-journey.test.ts]
- [x] Personalized daily tip based on user's recent waste types [test: e2e-user-journey.test.ts]
- [x] Nearby bins geospatial lookup (GET /bins/nearby) [test: e2e-user-journey.test.ts]
- [x] Notification triggers (streak at risk, disposal results, reward unlocked) [test: e2e-user-journey.test.ts]
- [x] Complete responsive PWA UI with onboarding, camera, heatmap, rewards, reporting, and admin dashboard [test: e2e-user-journey.test.ts]
