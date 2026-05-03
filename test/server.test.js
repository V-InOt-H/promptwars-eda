const request = require('supertest');
const app = require('../app.js');

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockImplementation((prompt) => {
            if (typeof prompt === 'string' && prompt.includes('THROW_ERROR')) {
              return Promise.reject(new Error('Simulated API Error'));
            }
            if (typeof prompt === 'string' && prompt.includes('NO_VERDICT')) {
              return Promise.resolve({
                response: { text: () => 'Just a plain rebuttal without verdict string.' }
              });
            }
            return Promise.resolve({
              response: {
                text: () => 'Mocked text response. VERDICT:{"userScore":8,"winner":"you","summary":"Mocked verdict!"}'
              }
            });
          })
        })
      };
    })
  };
});

// Mock NodeCache to throw errors on specific keys for coverage
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => {
    const actualCache = new (jest.requireActual('node-cache'))();
    return {
      get: (key) => {
        if (key === 'election_facts_error') throw new Error('Simulated Cache Error');
        return actualCache.get(key);
      },
      set: (key, val) => {
        return actualCache.set(key, val);
      }
    };
  });
});

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
  
  // Test 5: Validation for check eligibility
  test('POST /api/check-eligibility fails if missing params', async () => {
    const res = await request(app)
      .post('/api/check-eligibility')
      .send({ hasVoterId: true });
    expect(res.statusCode).toBe(400);
  });

  // Test 6: Election facts
  test('GET /api/election-facts returns array of facts', async () => {
    const res = await request(app).get('/api/election-facts');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.facts)).toBeTruthy();
  });

  // Test 7: Election process
  test('GET /api/election-process returns explanation', async () => {
    const res = await request(app).get('/api/election-process?step=registration');
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toBeDefined();
  });

  // Test 8: Debate Endpoint - Invalid payload
  test('POST /api/debate fails with empty payload', async () => {
      const res = await request(app).post('/api/debate').send({});
      expect(res.statusCode).toBe(400);
  });

  // Test 9: Debate Endpoint - Valid payload (Round 1 fallback)
  test('POST /api/debate succeeds', async () => {
      const res = await request(app)
          .post('/api/debate')
          .send({
              history: [],
              topic: 'Lower voting age to 16?',
              yourSide: 'Yes',
              aiSide: 'No',
              round: 1,
              maxRounds: 3
          });
      expect(res.statusCode).toBe(200);
      expect(res.body.text).toBeDefined();
  });

  // Test 10: Debate Endpoint - Final round verdict mock
  test('POST /api/debate succeeds round 3', async () => {
    const res = await request(app)
        .post('/api/debate')
        .send({
            history: [{role:'user',content:'test'}],
            topic: 'Lower voting age to 16?',
            yourSide: 'Yes',
            aiSide: 'No',
            round: 3,
            maxRounds: 3
        });
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toBeDefined();
  });

  // Test 11: Debate Endpoint - Verdict without specific string
  test('POST /api/debate verdict fallback when AI response lacks verdict string', async () => {
    const res = await request(app)
      .post('/api/debate')
      .send({
        history: [{role:'user',content:'NO_VERDICT'}],
        topic: 'Lower voting age to 16?',
        yourSide: 'Yes',
        aiSide: 'No',
        round: 3,
        maxRounds: 3
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toContain('A very balanced debate!');
  });

  // Test 12: Debate Endpoint - Final round verdict EXCEPTION fallback
  test('POST /api/debate verdict catch block', async () => {
    const res = await request(app)
      .post('/api/debate')
      .send({
        history: [{role:'user',content:'THROW_ERROR'}],
        topic: 'Lower voting age to 16?',
        yourSide: 'Yes',
        aiSide: 'No',
        round: 3,
        maxRounds: 3
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toContain('VERDICT:{"userScore":8');
  });

  // Test 13: Debate Endpoint - Final round without API key
  test('POST /api/debate verdict without API key', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';
    const res = await request(app)
      .post('/api/debate')
      .send({
        history: [{role:'user',content:'test'}],
        topic: 'Lower voting age to 16?',
        yourSide: 'Yes',
        aiSide: 'No',
        round: 3,
        maxRounds: 3
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toContain('vital for our democracy to thrive.');
    process.env.GEMINI_API_KEY = originalKey;
  });

  // Test 14: Election Process - Trigger 500
  test('GET /api/election-process triggers 500 error', async () => {
    const res = await request(app).get('/api/election-process?step=THROW_ERROR');
    expect(res.statusCode).toBe(500);
  });

  // Test 15: Election Facts - Cache hit
  test('GET /api/election-facts hits cache', async () => {
    await request(app).get('/api/election-facts');
    const res = await request(app).get('/api/election-facts');
    expect(res.statusCode).toBe(200);
  });

  // Test 16: Election Process - Cache hit
  test('GET /api/election-process hits cache', async () => {
    await request(app).get('/api/election-process?step=evm');
    const res = await request(app).get('/api/election-process?step=evm');
    expect(res.statusCode).toBe(200);
  });

  // Test 17: Election Process - Fallback without API key
  test('GET /api/election-process fallback without API key', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';
    const res = await request(app).get('/api/election-process?step=post');
    expect(res.statusCode).toBe(200);
    process.env.GEMINI_API_KEY = originalKey;
  });

  // Test 18: Election Process - Default step
  test('GET /api/election-process uses default step if missing', async () => {
    const res = await request(app).get('/api/election-process');
    expect(res.statusCode).toBe(200);
  });

});
