import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './app-test-helper';
import { db } from '../../../apps/api/src/data/store';

describe('Wildlife Rescue & Injury Report Integration', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
  });

  it('submits a wildlife report with watermarked photo, location data, and awards +20 credits', async () => {
    const user = db.createUser({
      email: 'wildlife-hero@cleanstreak.app',
      display_name: 'Wildlife Protector',
      timezone: 'UTC',
      role: 'user',
    });

    const initCredits = db.getUserCredits(user.id);
    expect(initCredits.balance).toBe(0);

    const reportPayload = {
      animal_type: 'dog',
      condition: 'bleeding_fracture',
      description: 'Stray dog with injured left leg near city park corner',
      photo_url: 'data:image/jpeg;base64,samplewatermarkedphotodata',
      captured_at: new Date().toISOString(),
      location: { lat: 28.6692, lng: 77.4538 },
      address_hint: 'Corner of Sector 4 & Central Park, Ghaziabad',
    };

    const res = await request(app)
      .post('/api/wildlife')
      .set('Authorization', `Bearer ${user.id}`)
      .send(reportPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.report.id).toBeDefined();
    expect(res.body.report.animal_type).toBe('dog');
    expect(res.body.report.condition).toBe('bleeding_fracture');
    expect(res.body.report.location.lat).toBe(28.6692);
    expect(res.body.report.location.lng).toBe(77.4538);
    expect(res.body.report.address_hint).toBe('Corner of Sector 4 & Central Park, Ghaziabad');
    expect(res.body.report.status).toBe('reported');
    expect(res.body.credits_awarded).toBe(20);

    // Verify credits in store
    const updatedCredits = db.getUserCredits(user.id);
    expect(updatedCredits.balance).toBe(20);
  });

  it('retrieves all wildlife reports and single report by id', async () => {
    const listRes = await request(app).get('/api/wildlife').expect(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.reports)).toBe(true);
    expect(listRes.body.reports.length).toBeGreaterThanOrEqual(1);

    const firstReportId = listRes.body.reports[0].id;
    const singleRes = await request(app).get(`/api/wildlife/${firstReportId}`).expect(200);
    expect(singleRes.body.success).toBe(true);
    expect(singleRes.body.report.id).toBe(firstReportId);
  });

  it('rejects squad dispatch for non-admin user with 403', async () => {
    const user = db.createUser({
      email: 'regular-user@cleanstreak.app',
      display_name: 'Regular Citizen',
      timezone: 'UTC',
      role: 'user',
    });

    const listRes = await request(app).get('/api/wildlife').expect(200);
    const reportId = listRes.body.reports[0].id;

    await request(app)
      .patch(`/api/admin/wildlife/${reportId}/dispatch`)
      .set('Authorization', `Bearer ${user.id}`)
      .send({
        team_name: 'Unauthorized Squad',
        contact_phone: '+1 555-0000',
        eta_minutes: 10,
      })
      .expect(403);
  });

  it('allows verified admin to dispatch a rescue squad and diagnose animal', async () => {
    // 1. Verify admin passcode through gateway
    const authRes = await request(app)
      .post('/api/admin/auth/verify')
      .send({ passcode: 'cleanstreak-admin-2026' })
      .expect(200);

    const adminToken = authRes.body.token;

    // 2. Submit new case
    const caseRes = await request(app)
      .post('/api/wildlife')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animal_type: 'bird',
        condition: 'trapped',
        description: 'Pigeon entangled in nylon kite string on low tree branch',
        photo_url: 'data:image/jpeg;base64,pigeonphoto',
        captured_at: new Date().toISOString(),
        location: { lat: 28.675, lng: 77.46 },
        address_hint: 'Near Metro Station Pillar 128',
      })
      .expect(201);

    const caseId = caseRes.body.report.id;

    // 3. Admin dispatches squad
    const dispatchRes = await request(app)
      .patch(`/api/admin/wildlife/${caseId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        team_name: 'Rapid Avian Rescue Unit',
        contact_phone: '+1 (800) 555-WING',
        eta_minutes: 12,
      })
      .expect(200);

    expect(dispatchRes.body.success).toBe(true);
    expect(dispatchRes.body.report.status).toBe('team_dispatched');
    expect(dispatchRes.body.report.dispatched_team.team_name).toBe('Rapid Avian Rescue Unit');
    expect(dispatchRes.body.report.dispatched_team.eta_minutes).toBe(12);

    // 4. Admin diagnoses and records treatment outcome
    const diagnoseRes = await request(app)
      .patch(`/api/admin/wildlife/${caseId}/diagnose`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        diagnosis_notes: 'String safely untangled with surgical shears. No wing fracture detected, antiseptic applied.',
        rescue_outcome: 'Released back into natural canopy after 30-minute observation.',
        status: 'treated_rescued',
      })
      .expect(200);

    expect(diagnoseRes.body.success).toBe(true);
    expect(diagnoseRes.body.report.status).toBe('treated_rescued');
    expect(diagnoseRes.body.report.diagnosis_notes).toContain('String safely untangled');
    expect(diagnoseRes.body.report.rescue_outcome).toContain('Released back into natural canopy');
    expect(diagnoseRes.body.report.resolved_at).toBeDefined();
  });
});
