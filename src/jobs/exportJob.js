const { pool } = require('../config/db');
const db = require('../config/db');
const csvWriter = require('../utils/csvWriter');
const watermarkQueries = require('../db/watermarkQueries');
const logger = require('../utils/logger');


exports.runFullExport = async (jobId, consumerId, filename) => {
  const startTime = Date.now();
  const client = await pool.connect();

  try {

    logger.info({
      event: "export_started",
      jobId,
      consumerId,
      exportType: "full"
    });

    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, name, email, created_at, updated_at, is_deleted
       FROM users
       WHERE is_deleted = FALSE
       ORDER BY updated_at DESC`
    );

    await csvWriter.writeUsersToCSV(filename, result.rows);

    // Update watermark with the latest updated_at timestamp
    if (result.rows.length > 0) {
      const latestTimestamp = result.rows[0].updated_at;

      await client.query(
        `INSERT INTO watermarks (consumer_id, last_exported_at, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (consumer_id)
         DO UPDATE
         SET last_exported_at = $2,
             updated_at = NOW()`,
        [consumerId, latestTimestamp]
      );
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;

    logger.info({
      event: "export_completed",
      jobId,
      consumerId,
      exportType: "full",
      rowsExported: result.rows.length,
      duration: `${duration}ms`
    });

  } catch (error) {

    await client.query('ROLLBACK');

    logger.error({
      event: "export_failed",
      jobId,
      consumerId,
      exportType: "full",
      error: error.message,
      stack: error.stack
    });

  } finally {
    client.release();
  }
};


exports.runIncrementalExport = async (jobId, consumerId, filename) => {
  const startTime = Date.now();
  const client = await pool.connect();

  try {

    logger.info({
      event: "export_started",
      jobId,
      consumerId,
      exportType: "incremental"
    });

    await client.query('BEGIN');

    const watermark = await watermarkQueries.getWatermark(consumerId);

    const lastExportedAt = watermark ? watermark.last_exported_at : new Date(0);

    const result = await client.query(
      `
      SELECT id, name, email, created_at, updated_at, is_deleted
      FROM users
      WHERE updated_at > $1
      AND is_deleted = FALSE
      `,
      [lastExportedAt]
    );

    await csvWriter.writeUsersToCSV(filename, result.rows);

    if (result.rows.length > 0) {

      const latestTimestamp = result.rows.reduce(
        (max, row) => row.updated_at > max ? row.updated_at : max,
        lastExportedAt
      );

      await client.query(
        `
        INSERT INTO watermarks (consumer_id, last_exported_at, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (consumer_id)
        DO UPDATE
        SET last_exported_at = $2,
            updated_at = NOW()
        `,
        [consumerId, latestTimestamp]
      );
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;

    logger.info({
      event: "export_completed",
      jobId,
      consumerId,
      exportType: "incremental",
      rowsExported: result.rows.length,
      duration: `${duration}ms`
    });

  } catch (error) {

    await client.query('ROLLBACK');

    logger.error({
      event: "export_failed",
      jobId,
      consumerId,
      exportType: "incremental",
      error: error.message,
      stack: error.stack
    });

  } finally {
    client.release();
  }
};



exports.runDeltaExport = async (jobId, consumerId, filename) => {
  const startTime = Date.now();
  const client = await pool.connect();

  try {

    logger.info({
      event: "export_started",
      jobId,
      consumerId,
      exportType: "delta"
    });

    await client.query('BEGIN');

    const watermark = await watermarkQueries.getWatermark(consumerId);

    const lastExportedAt = watermark ? watermark.last_exported_at : new Date(0);

    const result = await client.query(
      `
      SELECT id, name, email, created_at, updated_at, is_deleted
      FROM users
      WHERE updated_at > $1
      `,
      [lastExportedAt]
    );

    const rows = result.rows.map(user => {

      let operation = 'UPDATE';

      if (user.is_deleted) {
        operation = 'DELETE';
      } 
      else if (user.created_at.getTime() === user.updated_at.getTime()) {
        operation = 'INSERT';
      }

      return {
        operation,
        ...user
      };

    });

    await csvWriter.writeDeltaToCSV(filename, rows);

    if (rows.length > 0) {

      const latestTimestamp = rows.reduce(
        (max, row) => row.updated_at > max ? row.updated_at : max,
        lastExportedAt
      );

      await client.query(
        `
        INSERT INTO watermarks (consumer_id, last_exported_at, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (consumer_id)
        DO UPDATE
        SET last_exported_at = $2,
            updated_at = NOW()
        `,
        [consumerId, latestTimestamp]
      );
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;

    logger.info({
      event: "export_completed",
      jobId,
      consumerId,
      exportType: "delta",
      rowsExported: rows.length,
      duration: `${duration}ms`
    });

  } catch (error) {

    await client.query('ROLLBACK');

    logger.error({
      event: "export_failed",
      jobId,
      consumerId,
      exportType: "delta",
      error: error.message,
      stack: error.stack
    });

  } finally {
    client.release();
  }
};