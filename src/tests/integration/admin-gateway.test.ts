import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './app-test-helper';
import { db } from '../../../apps/api/src/data/store';

describe('Admin Authentication Gateway Integration', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
  });

  it('rejects access to /admin/reviews without admin credentials', async () => {
    // Normal user token
    const user = db.createUser({
      email: 'citizen-visitor@cleanstreak.app',
      display_name: 'Regular Citizen',
      timezone: 'UTC',
      role: 'user',
    });

    const res = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${user.id}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('verifies valid admin security passcode through gateway', async () => {
    const res = await request(app)
      .post('/api/admin/auth/verify')
      .send({ passcode: 'cleanstreak-admin-2026' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('admin');

    // Token allows access to admin reviews
    const adminRes = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${res.body.token}`)
      .expect(200);

    expect(Array.isArray(adminRes.body.reviews)).toBe(true);
  });

  it('verifies authorized moderator email through gateway', async () => {
    const res = await request(app)
      .post('/api/admin/auth/verify')
      .send({ email: 'moderator@cleanstreak.app' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('rejects invalid passcode with 401', async () => {
    const res = await request(app)
      .post('/api/admin/auth/verify')
      .send({ passcode: 'wrong-guess-123' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_GATEWAY_CREDENTIALS');
  });
});
