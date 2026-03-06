const db = require('../config/db');

exports.getWatermark = async (consumerId) => {
  const result = await db.query(
    `SELECT consumer_id, last_exported_at
     FROM watermarks
     WHERE consumer_id = $1`,
    [consumerId]
  );

  return result.rows[0];
};

exports.updateWatermark = async (consumerId, timestamp) => {
  await db.query(
    `
    INSERT INTO watermarks (consumer_id, last_exported_at, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (consumer_id)
    DO UPDATE
    SET last_exported_at = $2,
        updated_at = NOW()
    `,
    [consumerId, timestamp]
  );
};