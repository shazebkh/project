import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './app-test-helper';
import { db } from '../../../apps/api/src/data/store';

describe('Rewards and Redemptions Integration (Section 6 & Section 11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
  });

  it('enforces tier requirements based on lifetime credits, so spending never demotes', async () => {
    const user = db.createUser({
      email: 'collector@cleanstreak.app',
      display_name: 'Eco Champion',
      timezone: 'UTC',
    });

    // Award 600 credits to hit Silver tier (min 500 lifetime)
    db.appendLedgerEntry({
      user_id: user.id,
      delta: 600,
      reason: 'disposal',
      ref_type: 'bulk',
      ref_id: 'test-seed-600',
    });

    // Check credits and tier
    const credRes = await request(app)
      .get('/api/me/credits')
      .set('Authorization', `Bearer ${user.id}`)
      .expect(200);

    expect(credRes.body.balance).toBe(600);
    expect(credRes.body.lifetime).toBe(600);
    expect(credRes.body.tier).toBe('silver');

    // Redeem a Silver tier reward costing 500 credits ('rew-3' tote bag)
    const redeemRes = await request(app)
      .post('/api/rewards/rew-3/redeem')
      .set('Authorization', `Bearer ${user.id}`)
      .expect(200);

    expect(redeemRes.body.code).toBeDefined();
    expect(redeemRes.body.balance).toBe(100); // 600 - 500 = 100

    // Verify: even though balance is now only 100, lifetime is still 600, so tier remains SILVER!
    const credAfter = await request(app)
      .get('/api/me/credits')
      .set('Authorization', `Bearer ${user.id}`)
      .expect(200);

    expect(credAfter.body.balance).toBe(100);
    expect(credAfter.body.lifetime).toBe(600);
    expect(credAfter.body.tier).toBe('silver'); // NEVER demoted!
  });

  it('rejects redemption when credits are insufficient', async () => {
    const user = db.createUser({
      email: 'broke@cleanstreak.app',
      display_name: 'Broke User',
      timezone: 'UTC',
    });

    // Only 20 credits, trying to buy 50 credit badge
    db.appendLedgerEntry({
      user_id: user.id,
      delta: 20,
      reason: 'disposal',
      ref_type: 'test',
      ref_id: 't-20',
    });

    const res = await request(app)
      .post('/api/rewards/rew-1/redeem')
      .set('Authorization', `Bearer ${user.id}`)
      .expect(400);

    expect(res.body.error.code).toBe('INSUFFICIENT_CREDITS');
  });

  it('rejects redemption when reward tier is locked', async () => {
    const bronzeUser = db.createUser({
      email: 'bronze@cleanstreak.app',
      display_name: 'Bronze User',
      timezone: 'UTC',
    });

    // Has 2000 credits, but lifetime is only 2000 -> gold. Trying to redeem Platinum reward ('rew-7' 4000)
    db.appendLedgerEntry({
      user_id: bronzeUser.id,
      delta: 2000,
      reason: 'disposal',
      ref_type: 'test',
      ref_id: 't-2000',
    });

    const res = await request(app)
      .post('/api/rewards/rew-7/redeem')
      .set('Authorization', `Bearer ${bronzeUser.id}`)
      .expect(403);

    expect(res.body.error.code).toBe('TIER_LOCKED');
  });
});
