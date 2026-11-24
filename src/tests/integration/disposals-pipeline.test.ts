import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './app-test-helper';
import { db } from '../../../apps/api/src/data/store';

describe('Disposal Pipeline Integration (Section 4 & Section 11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
  });

  it('signs upload URL properly', async () => {
    const res = await request(app)
      .post('/api/uploads/sign')
      .set('Authorization', 'Bearer demo-user-1')
      .expect(200);

    expect(res.body.upload_url).toBeDefined();
    expect(res.body.photo_key).toMatch(/^uploads\//);
  });

  it('rejects stale capture (> 5 minutes old)', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/disposals')
      .set('Authorization', 'Bearer demo-user-1')
      .send({
        photo_key: 'uploads/2026/stale.jpg',
        photo_data: 'pixel-stream-abc-1',
        lat: 28.6692,
        lng: 77.4538,
        captured_at: tenMinutesAgo,
      })
      .expect(400);

    expect(res.body.error.code).toBe('STALE_CAPTURE');
  });

  it('rejects duplicate pHash photo across users', async () => {
    const now = new Date().toISOString();
    const photoData = 'data:image/jpeg;base64,' + btoa('same-dustbin-photo-bytes-repeated');

    // First submission succeeds
    await request(app)
      .post('/api/disposals')
      .set('Authorization', 'Bearer demo-user-1')
      .send({
        photo_key: 'uploads/photo1.jpg',
        photo_data: photoData,
        lat: 28.6692,
        lng: 77.4538,
        captured_at: now,
      })
      .expect(202);

    // Second user submits near-identical image -> rejected 409
    const secondUser = db.createUser({
      email: 'second@cleanstreak.app',
      display_name: 'Second User',
      timezone: 'UTC',
    });

    const dupRes = await request(app)
      .post('/api/disposals')
      .set('Authorization', `Bearer ${secondUser.id}`)
      .send({
        photo_key: 'uploads/photo2.jpg',
        photo_data: photoData,
        lat: 28.6692,
        lng: 77.4538,
        captured_at: now,
      })
      .expect(409);

    expect(dupRes.body.error.code).toBe('DUPLICATE_PHOTO');
  });

  it('completes full flow: submission -> admin review -> streak and credit award with idempotency', async () => {
    const now = new Date().toISOString();
    const testUser = db.createUser({
      email: 'tester@cleanstreak.app',
      display_name: 'Habit Hero',
      timezone: 'UTC',
      trust_score: 0.6, // will route to review
    });

    // 1. Submit disposal photo
    const submitRes = await request(app)
      .post('/api/disposals')
      .set('Authorization', `Bearer ${testUser.id}`)
      .send({
        photo_key: 'uploads/unique-photo-review.jpg',
        photo_data: 'data:image/jpeg;base64,' + btoa('unique-clean-bin-frame-48291'),
        lat: 28.6692,
        lng: 77.4538,
        gps_accuracy_m: 10.0,
        captured_at: now,
      })
      .expect(202);

    const disposalId = submitRes.body.id;
    expect(disposalId).toBeDefined();

    // 2. Admin retrieves review queue
    const reviewsRes = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', 'Bearer admin-user-1')
      .expect(200);

    const pendingReview = reviewsRes.body.reviews.find((r: any) => r.id === disposalId);
    expect(pendingReview).toBeDefined();

    // 3. Admin approves disposal
    const approveRes = await request(app)
      .post(`/api/admin/reviews/${disposalId}/decision`)
      .set('Authorization', 'Bearer admin-user-1')
      .send({ decision: 'approve' })
      .expect(200);

    expect(approveRes.body.status).toBe('approved');
    expect(approveRes.body.creditsAwarded).toBe(10); // First disposal of day = 10 credits
    expect(approveRes.body.streakIncremented).toBe(true);

    // 4. Verify user streak incremented
    const streakRes = await request(app)
      .get('/api/me/streak')
      .set('Authorization', `Bearer ${testUser.id}`)
      .expect(200);

    expect(streakRes.body.current).toBe(1);

    // 5. Verify user credits ledger
    const creditsRes = await request(app)
      .get('/api/me/credits')
      .set('Authorization', `Bearer ${testUser.id}`)
      .expect(200);

    expect(creditsRes.body.balance).toBe(10);
    expect(creditsRes.body.lifetime).toBe(10);

    // 6. Test IDEMPOTENCY: processing approval second time does NOT award double credits
    const retryRes = await request(app)
      .post(`/api/admin/reviews/${disposalId}/decision`)
      .set('Authorization', 'Bearer admin-user-1')
      .send({ decision: 'approve' })
      .expect(200);

    expect(retryRes.body.creditsAwarded).toBe(0); // 0 additional credits awarded
    const creditsRes2 = await request(app)
      .get('/api/me/credits')
      .set('Authorization', `Bearer ${testUser.id}`)
      .expect(200);

    expect(creditsRes2.body.balance).toBe(10); // Still 10!
  });
});
