import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './app-test-helper';
import { db } from '../../../apps/api/src/data/store';
import { authorityAdapter } from '../../../apps/api/src/services/authorityAdapter';

describe('Government Reporting Integration (Section 8 & Section 11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
    authorityAdapter.sentMails = [];
  });

  it('submits report and forwards to authority adapter', async () => {
    const user = db.createUser({
      email: 'citizen1@cleanstreak.app',
      display_name: 'Citizen Jane',
      timezone: 'UTC',
    });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user.id}`)
      .send({
        category: 'overflowing_bin',
        description: 'Trash spilling onto pedestrian footpath',
        photo_keys: ['uploads/overflow-bin.jpg'],
        lat: 28.6692,
        lng: 77.4538,
        severity: 2,
      })
      .expect(201);

    expect(res.body.is_duplicate).toBe(false);
    expect(res.body.report.status).toBe('forwarded');
    expect(res.body.report.external_ref).toBeDefined();

    // Verify email adapter was triggered with map link and details
    expect(authorityAdapter.sentMails.length).toBe(1);
    expect(authorityAdapter.sentMails[0].body).toContain('overflowing_bin');
    expect(authorityAdapter.sentMails[0].body).toContain('openstreetmap.org');
  });

  it('merges duplicate reports within 50 m and 7 days, incrementing support_count', async () => {
    const userA = db.createUser({ email: 'ua@cleanstreak.app', display_name: 'User A', timezone: 'UTC' });
    const userB = db.createUser({ email: 'ub@cleanstreak.app', display_name: 'User B', timezone: 'UTC' });

    // User A submits report
    const resA = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userA.id}`)
      .send({
        category: 'illegal_dumping',
        description: 'Construction debris in alley',
        photo_keys: ['uploads/debris.jpg'],
        lat: 28.66920,
        lng: 77.45380,
      })
      .expect(201);

    const reportId = resA.body.report.id;

    // User B submits same category 15 meters away -> merged as duplicate!
    const resB = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userB.id}`)
      .send({
        category: 'illegal_dumping',
        description: 'Also saw piles of rubble here',
        photo_keys: ['uploads/debris-2.jpg'],
        lat: 28.66930, // ~11m away
        lng: 77.45380,
      })
      .expect(200);

    expect(resB.body.is_duplicate).toBe(true);
    expect(resB.body.report.id).toBe(reportId);
    expect(resB.body.report.support_count).toBe(2);
  });

  it('citizen confirm-resolved marks report resolved and awards 15 credits', async () => {
    const reporter = db.createUser({ email: 'rep@cleanstreak.app', display_name: 'Reporter', timezone: 'UTC' });

    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporter.id}`)
      .send({
        category: 'open_burning',
        photo_keys: ['uploads/smoke.jpg'],
        lat: 28.6700,
        lng: 77.4500,
      })
      .expect(201);

    const reportId = createRes.body.report.id;

    // Confirm resolution
    const confirmRes = await request(app)
      .post(`/api/reports/${reportId}/confirm-resolved`)
      .set('Authorization', `Bearer ${reporter.id}`)
      .expect(200);

    expect(confirmRes.body.report.status).toBe('resolved');
    expect(confirmRes.body.credits_awarded).toBe(15);

    // Verify credits in reporter balance
    const credRes = await request(app)
      .get('/api/me/credits')
      .set('Authorization', `Bearer ${reporter.id}`)
      .expect(200);

    expect(credRes.body.balance).toBe(15);
  });

  it('enforces maximum 3 reports per user per day', async () => {
    const user = db.createUser({ email: 'spammer@cleanstreak.app', display_name: 'Spammer', timezone: 'UTC' });

    // Submit 3 reports at different locations
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${user.id}`)
        .send({
          category: 'missing_bin',
          photo_keys: [`uploads/missing-${i}.jpg`],
          lat: 28.0 + (i * 0.1),
          lng: 77.0 + (i * 0.1),
        })
        .expect(201);
    }

    // 4th report should be rejected 429
    const fourthRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user.id}`)
      .send({
        category: 'missing_bin',
        photo_keys: ['uploads/missing-4.jpg'],
        lat: 29.0,
        lng: 78.0,
      })
      .expect(429);

    expect(fourthRes.body.error.code).toBe('REPORT_LIMIT_EXCEEDED');
  });
});
