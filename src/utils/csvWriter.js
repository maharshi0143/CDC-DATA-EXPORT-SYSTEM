const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

exports.writeUsersToCSV = async (filename, users) => {
  const outputDir = path.join(process.cwd(), 'output');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvWriter = createCsvWriter({
    path: path.join(outputDir, filename),
    header: [
      { id: 'id', title: 'id' },
      { id: 'name', title: 'name' },
      { id: 'email', title: 'email' },
      { id: 'created_at', title: 'created_at' },
      { id: 'updated_at', title: 'updated_at' },
      { id: 'is_deleted', title: 'is_deleted' }
    ]
  });

  await csvWriter.writeRecords(users);
};


exports.writeDeltaToCSV = async (filename, users) => {
  const outputDir = path.join(process.cwd(), 'output');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvWriter = createCsvWriter({
    path: path.join(outputDir, filename),
    header: [
      { id: 'operation', title: 'operation' },
      { id: 'id', title: 'id' },
      { id: 'name', title: 'name' },
      { id: 'email', title: 'email' },
      { id: 'created_at', title: 'created_at' },
      { id: 'updated_at', title: 'updated_at' },
      { id: 'is_deleted', title: 'is_deleted' }
    ]
  });

  await csvWriter.writeRecords(users);
};