const exportJob = require('../src/jobs/exportJob');
const db = require('../src/config/db');
const { pool } = require('../src/config/db');
const csvWriter = require('../src/utils/csvWriter');
const watermarkQueries = require('../src/db/watermarkQueries');
const logger = require('../src/utils/logger');

jest.mock('../src/config/db');
jest.mock('../src/utils/csvWriter');
jest.mock('../src/db/watermarkQueries');
jest.mock('../src/utils/logger');

describe('Export Job', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runFullExport', () => {

    test('should export all active users to CSV', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);

      const mockUsers = [
        {
          id: 1,
          name: "Test User 1",
          email: "test1@test.com",
          created_at: new Date(),
          updated_at: new Date(),
          is_deleted: false
        }
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockUsers }) // SELECT users
        .mockResolvedValueOnce(undefined) // INSERT watermark
        .mockResolvedValueOnce(undefined); // COMMIT

      csvWriter.writeUsersToCSV.mockResolvedValue();

      await exportJob.runFullExport('job-123', 'consumer-1', 'full.csv');

      expect(csvWriter.writeUsersToCSV).toHaveBeenCalledWith('full.csv', mockUsers);
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'export_completed' }));
      expect(mockClient.release).toHaveBeenCalled();

    });

    test('should handle errors during full export', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);

      const testError = new Error('Database connection failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(testError); // SELECT fails

      await exportJob.runFullExport('job-123', 'consumer-1', 'full.csv');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: 'export_failed' }));
      expect(mockClient.release).toHaveBeenCalled();

    });

  });

  describe('runIncrementalExport', () => {

    test('should export users with updates since last watermark', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);
      watermarkQueries.getWatermark.mockResolvedValue({ last_exported_at: new Date('2026-01-01') });

      const mockUsers = [
        {
          id: 1,
          name: "Updated User",
          email: "updated@test.com",
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-03-01'),
          is_deleted: false
        }
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      csvWriter.writeUsersToCSV.mockResolvedValue();

      await exportJob.runIncrementalExport('job-123', 'consumer-1', 'incremental.csv');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

    });

    test('should use epoch time as default watermark', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);
      watermarkQueries.getWatermark.mockResolvedValue(null);

      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined);

      csvWriter.writeUsersToCSV.mockResolvedValue();

      await exportJob.runIncrementalExport('job-123', 'consumer-1', 'incremental.csv');

      expect(mockClient.release).toHaveBeenCalled();

    });

    test('should rollback on error', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);
      const testError = new Error('Query failed');
      mockClient.query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(testError);

      await exportJob.runIncrementalExport('job-123', 'consumer-1', 'incremental.csv');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();

    });

  });

  describe('runDeltaExport', () => {

    test('should identify INSERT, UPDATE, and DELETE operations', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);
      watermarkQueries.getWatermark.mockResolvedValue({ last_exported_at: new Date('2026-01-01') });

      const now = new Date();
      const mockUsers = [
        {
          id: 1,
          name: "Inserted User",
          email: "inserted@test.com",
          created_at: now,
          updated_at: now,
          is_deleted: false
        },
        {
          id: 2,
          name: "Updated User",
          email: "updated@test.com",
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-03-02'),
          is_deleted: false
        },
        {
          id: 3,
          name: "Deleted User",
          email: "deleted@test.com",
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-03-03'),
          is_deleted: true
        }
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      csvWriter.writeDeltaToCSV.mockResolvedValue();

      await exportJob.runDeltaExport('job-123', 'consumer-1', 'delta.csv');

      const capturedRows = csvWriter.writeDeltaToCSV.mock.calls[0][1];

      expect(capturedRows[0].operation).toBe('INSERT');
      expect(capturedRows[1].operation).toBe('UPDATE');
      expect(capturedRows[2].operation).toBe('DELETE');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

    });

    test('should handle delta export with no changes', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);
      watermarkQueries.getWatermark.mockResolvedValue({ last_exported_at: new Date('2026-01-01') });

      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined);

      csvWriter.writeDeltaToCSV.mockResolvedValue();

      await exportJob.runDeltaExport('job-123', 'consumer-1', 'delta-no-changes.csv');

      expect(csvWriter.writeDeltaToCSV).toHaveBeenCalledWith('delta-no-changes.csv', []);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

    });

    test('should rollback delta export on error', async () => {

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      pool.connect.mockResolvedValue(mockClient);

      const testError = new Error('CSV write failed');
      mockClient.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ rows: [] });

      csvWriter.writeDeltaToCSV.mockRejectedValue(testError);

      await exportJob.runDeltaExport('job-123', 'consumer-1', 'delta.csv');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();

    });

  });

});
