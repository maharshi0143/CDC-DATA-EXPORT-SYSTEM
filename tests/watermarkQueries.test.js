const watermarkQueries = require('../src/db/watermarkQueries');
const db = require('../src/config/db');

jest.mock('../src/config/db');

describe('Watermark Queries', () => {

  test('getWatermark returns data', async () => {

    db.query.mockResolvedValue({ rows: [{ consumer_id: "c1" }] });

    const result = await watermarkQueries.getWatermark("c1");

    expect(result.consumer_id).toBe("c1");

  });

});