jest.mock('pg');

const db = require('../src/config/db');

describe('Database Configuration', () => {

  test('should export query function', () => {

    expect(typeof db.query).toBe('function');

  });

  test('should export pool object', () => {

    expect(db.pool).toBeDefined();

  });

});
