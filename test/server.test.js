const request = require('supertest');
const app = require('../server.js');

describe('Server Endpoints', () => {
  // Test 1: Health check
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // Test 2: Static file serving
  test('GET / returns election.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Election Debate Arena');
  });

  // Test 3: Voter eligibility checker (eligible)
  test('POST /api/check-eligibility returns eligible for 19yo with Voter ID', async () => {
    const res = await request(app)
      .post('/api/check-eligibility')
      .send({ age: 19, hasVoterId: true, state: 'Tamil Nadu' });
    expect(res.statusCode).toBe(200);
    expect(res.body.eligible).toBe(true);
  });

  // Test 4: Voter eligibility checker (underage)
  test('POST /api/check-eligibility returns ineligible for 17yo', async () => {
    const res = await request(app)
      .post('/api/check-eligibility')
      .send({ age: 17, hasVoterId: true, state: 'Delhi' });
    expect(res.statusCode).toBe(200);
    expect(res.body.eligible).toBe(false);
  });
});
