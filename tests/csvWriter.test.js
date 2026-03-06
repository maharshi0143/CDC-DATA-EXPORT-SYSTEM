const fs = require('fs');
const path = require('path');
const csvWriter = require('../src/utils/csvWriter');

describe('CSV Writer', () => {

  const outputDir = path.join(process.cwd(), 'output');

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterEach(() => {
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(outputDir, file));
    });
  });

  test('writeUsersToCSV should run without error', async () => {

    const users = [
      {
        id: 1,
        name: "Test",
        email: "test@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      }
    ];

    await csvWriter.writeUsersToCSV('test.csv', users);

    const filePath = path.join(outputDir, 'test.csv');

    expect(fs.existsSync(filePath)).toBe(true);

  });

  test('writeUsersToCSV should create file with correct headers', async () => {

    const users = [
      {
        id: 1,
        name: "Test User",
        email: "test@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      }
    ];

    await csvWriter.writeUsersToCSV('test-headers.csv', users);

    const filePath = path.join(outputDir, 'test-headers.csv');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('id,name,email,created_at,updated_at,is_deleted');

  });

  test('writeUsersToCSV should create file with multiple records', async () => {

    const users = [
      {
        id: 1,
        name: "User 1",
        email: "user1@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      },
      {
        id: 2,
        name: "User 2",
        email: "user2@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      }
    ];

    await csvWriter.writeUsersToCSV('test-multiple.csv', users);

    const filePath = path.join(outputDir, 'test-multiple.csv');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(3);

  });

  test('writeDeltaToCSV should run without error', async () => {

    const users = [
      {
        operation: 'INSERT',
        id: 1,
        name: "New User",
        email: "new@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      }
    ];

    await csvWriter.writeDeltaToCSV('delta.csv', users);

    const filePath = path.join(outputDir, 'delta.csv');

    expect(fs.existsSync(filePath)).toBe(true);

  });

  test('writeDeltaToCSV should create file with operation column', async () => {

    const users = [
      {
        operation: 'UPDATE',
        id: 1,
        name: "Updated User",
        email: "updated@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      }
    ];

    await csvWriter.writeDeltaToCSV('delta-op.csv', users);

    const filePath = path.join(outputDir, 'delta-op.csv');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('operation');

  });

  test('writeDeltaToCSV should handle DELETE operations', async () => {

    const users = [
      {
        operation: 'DELETE',
        id: 1,
        name: "Deleted User",
        email: "deleted@test.com",
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: true
      }
    ];

    await csvWriter.writeDeltaToCSV('delta-delete.csv', users);

    const filePath = path.join(outputDir, 'delta-delete.csv');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('DELETE');

  });

});