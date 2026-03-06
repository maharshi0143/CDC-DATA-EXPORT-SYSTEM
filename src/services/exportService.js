const exportJob = require('../jobs/exportJob');
const watermarkQueries = require('../db/watermarkQueries');

exports.startFullExport = (jobId, consumerId, filename) => {
  setImmediate(() => {
    exportJob.runFullExport(jobId, consumerId, filename);
  });
};

exports.getWatermark = async (consumerId) => {
  return await watermarkQueries.getWatermark(consumerId);
};

exports.startIncrementalExport = (jobId, consumerId, filename) => {
  setImmediate(() => {
    exportJob.runIncrementalExport(jobId, consumerId, filename);
  });
};

exports.startDeltaExport = (jobId, consumerId, filename) => {
  setImmediate(() => {
    exportJob.runDeltaExport(jobId, consumerId, filename);
  });
};