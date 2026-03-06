const request = require('supertest');

// Set up environment variables before importing app
process.env.VALID_API_KEYS = 'dev-key-1234567890,test-key-for-testing';

const app = require('../src/app');

/* Mock export service so background jobs don't run during tests */
jest.mock('../src/services/exportService', () => ({
  startFullExport: jest.fn(),
  startIncrementalExport: jest.fn(),
  startDeltaExport: jest.fn(),
  getWatermark: jest.fn()
}));

/* Mock database for health check */
jest.mock('../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  pool: {
    connect: jest.fn()
  }
}));

describe('Export APIs', () => {

  const validApiKey = 'dev-key-1234567890'; // Matches VALID_API_KEYS env var

  test('POST /exports/full should require API key', async () => {

    const res = await request(app)
      .post('/exports/full')
      .set('X-Consumer-ID', 'test-consumer');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');

  });

  test('POST /exports/full should require consumer id', async () => {

    const res = await request(app)
      .post('/exports/full')
      .set('X-API-Key', validApiKey);

    expect(res.statusCode).toBe(400);

  });

  test('POST /exports/full should reject invalid API key', async () => {

    const res = await request(app)
      .post('/exports/full')
      .set('X-API-Key', 'invalid-key')
      .set('X-Consumer-ID', 'test-consumer');

    expect(res.statusCode).toBe(401);

  });

  test('POST /exports/full should start export job', async () => {

    const res = await request(app)
      .post('/exports/full')
      .set('X-API-Key', validApiKey)
      .set('X-Consumer-ID', 'test-consumer');

    expect(res.statusCode).toBe(202);

    expect(res.body).toHaveProperty('jobId');
    expect(res.body.exportType).toBe('full');

  });


  test('GET /exports/watermark without consumer id', async () => {

    const res = await request(app)
      .get('/exports/watermark')
      .set('X-API-Key', validApiKey);

    expect(res.statusCode).toBe(400);

  });


  test('POST /exports/incremental should start export job', async () => {

    const res = await request(app)
      .post('/exports/incremental')
      .set('X-API-Key', validApiKey)
      .set('X-Consumer-ID', 'test-consumer');

    expect(res.statusCode).toBe(202);

    expect(res.body.exportType).toBe('incremental');

  });


  test('POST /exports/delta should start export job', async () => {

    const res = await request(app)
      .post('/exports/delta')
      .set('X-API-Key', validApiKey)
      .set('X-Consumer-ID', 'test-consumer');

    expect(res.statusCode).toBe(202);

    expect(res.body.exportType).toBe('delta');

  });


  test('GET /exports/watermark with consumer id', async () => {

    const res = await request(app)
      .get('/exports/watermark')
      .set('X-API-Key', validApiKey)
      .set('X-Consumer-ID', 'test-consumer');

    // watermark may or may not exist
    expect([200, 404]).toContain(res.statusCode);

  });

});