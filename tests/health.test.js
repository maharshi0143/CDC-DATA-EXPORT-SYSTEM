const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

jest.mock('../src/config/db');

describe('Health API', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health should return status ok when healthy', async () => {

    // Mock successful database query
    db.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('checks');
    expect(response.body.checks).toHaveProperty('database');
    expect(response.body.checks.database.status).toBe('healthy');

  });

  test('GET /health should return 503 when database unhealthy', async () => {

    // Mock failed database query
    db.query.mockRejectedValue(new Error('Connection refused'));

    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.database.status).toBe('unhealthy');

  });

  test('Health check should include memory and disk checks', async () => {

    db.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await request(app).get('/health');

    expect(response.body.checks).toHaveProperty('memory');
    expect(response.body.checks.memory).toHaveProperty('status');
    expect(response.body.checks.memory).toHaveProperty('usage');

  });

});