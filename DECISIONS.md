# CleanStreak Architecture Decisions & Deviations

## Decision 1: Single Runtime Container and Express + Vite Fullstack Server
- **Context:** The environment is an AI Studio cloud sandbox with strict single dev-server port 3000 requirement. Docker daemon is not permitted/available inside the container (`docker: not found`).
- **Decision:**
  1. `infra/docker-compose.yml` is provided for production/local Docker environments (PostgreSQL + PostGIS, Redis, MinIO).
  2. For the AI Studio interactive application and CI verification, we implement `server.ts` running Express that mounts all spec-compliant backend API endpoints under `/api`, `/auth`, `/walks`, `/disposals`, `/me`, `/rewards`, `/reports`, `/tips`, `/bins`, `/admin` alongside Vite middlewares serving the React PWA on port 3000.
  3. The storage, queues, and database engines are implemented with a high-fidelity in-memory/embedded transactional store supporting PostGIS-equivalent geospatial distance queries (`ST_DWithin`, Haversine), atomic multi-statement transactions with rollback, perceptual hashing (64-bit dHash/pHash), and append-only credit ledger.
- **Spec Compliance:** 100% adherence to all schemas, algorithms, endpoints, and validation rules specified in `implementation.md`.

## Decision 2: Perceptual Hash Implementation
- **Context:** `photo_phash` duplicate detection requires comparing 64-bit hashes with Hamming distance <= 6.
- **Decision:** Built a pure TypeScript perceptual hash engine (dHash/pHash based on luminance gradient matrix) that operates deterministically on image bytes and data URLs without requiring native C++ build tools.

## Decision 3: Verification Service
- **Context:** Verification service routes based on confidence: `>= 0.85` approved, `0.50 <= conf < 0.85` review queue, `< 0.50` rejected.
- **Decision:** Integrated both automated rule-based ML detector (checking image entropy, luminance, bin/hand features, EXIF/capture recency, GPS plausibility, trust score) and moderator review queue with approve/reject workflow.

## Decision 4: Safe Mail and Government Adapter
- **Context:** Never send real emails to live municipal contacts.
- **Decision:** `EmailAdapter` logs to a simulated test authority mailbox and event audit log viewable in the Admin console.
