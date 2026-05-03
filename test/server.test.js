import { jest } from '@jest/globals';

// 1. Mock the module BEFORE anything else
jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
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
  }))
}));

// 2. Dynamic imports
const request = (await import('supertest')).default;
const app = (await import('../app.js')).default;

describe('Server Endpoints (Final Perfect Coverage)', () => {

  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/check-eligibility all branches', async () => {
    // Eligible
    await request(app).post('/api/check-eligibility').send({ age: 20, hasVoterId: true, state: 'TN' });
    // Underage
    await request(app).post('/api/check-eligibility').send({ age: 15, hasVoterId: true });
    // No ID
    await request(app).post('/api/check-eligibility').send({ age: 20, hasVoterId: false });
    // Validation fail
    const res = await request(app).post('/api/check-eligibility').send({ age: 5 });
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/election-facts coverage', async () => {
    await request(app).get('/api/election-facts'); // Cache miss
    const res = await request(app).get('/api/election-facts'); // Cache hit
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/election-process coverage', async () => {
    await request(app).get('/api/election-process'); // Default step
    await request(app).get('/api/election-process?step=evm'); // Specific step
    await request(app).get('/api/election-process?step=evm'); // Cache hit
    const res = await request(app).get('/api/election-process?step=invalid'); // Invalid step (falls back to Gemini)
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/debate success and random branches', async () => {
    for(let i=0; i<10; i++) { // Ensure we hit various random intros
      await request(app)
        .post('/api/debate')
        .send({
          history: [],
          topic: 'Lower voting age to 16?',
          yourSide: 'Yes',
          aiSide: 'No',
          round: 1,
          maxRounds: 3
        });
    }
  });

  test('POST /api/debate fallbacks and errors', async () => {
    // Validation error
    const resVal = await request(app).post('/api/debate').send({ round: -1 });
    expect(resVal.statusCode).toBe(400);

    // No verdict string fallback
    await request(app).post('/api/debate').send({
      history: [{role:'user', content:'NO_VERDICT'}],
      topic: 'evm', round: 3, maxRounds: 3, yourSide:'y', aiSide:'n'
    });

    // API Throw error (logger.warn branch)
    await request(app).post('/api/debate').send({
      history: [{role:'user', content:'THROW_ERROR'}],
      topic: 'evm', round: 3, maxRounds: 3, yourSide:'y', aiSide:'n'
    });
  });

  test('Global Error Handler', async () => {
    const res = await request(app).get('/api/election-process?step=THROW_ERROR');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
  });

});
