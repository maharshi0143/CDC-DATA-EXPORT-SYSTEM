const { v4: uuidv4 } = require('uuid');
const exportService = require('../services/exportService');

exports.fullExport = async (req, res) => {
  const consumerId = req.header('X-Consumer-ID');

  if (!consumerId) {
    return res.status(400).json({
      error: 'X-Consumer-ID header is required'
    });
  }

  const jobId = uuidv4();

  const filename = `full_${consumerId}_${Date.now()}.csv`;

  exportService.startFullExport(jobId, consumerId, filename);

  return res.status(202).json({
    jobId,
    status: 'started',
    exportType: 'full',
    outputFilename: filename
  });
};

exports.getWatermark = async (req, res) => {
  const consumerId = req.header('X-Consumer-ID');

  if (!consumerId) {
    return res.status(400).json({
      error: 'X-Consumer-ID header is required'
    });
  }

  const watermark = await exportService.getWatermark(consumerId);

  if (!watermark) {
    return res.status(404).json({
      message: 'No watermark found for this consumer'
    });
  }

  return res.status(200).json({
    consumerId: watermark.consumer_id,
    lastExportedAt: watermark.last_exported_at
  });
};

exports.incrementalExport = async (req, res) => {
  const consumerId = req.header('X-Consumer-ID');

  if (!consumerId) {
    return res.status(400).json({
      error: 'X-Consumer-ID header is required'
    });
  }

  const { v4: uuidv4 } = require('uuid');

  const jobId = uuidv4();

  const filename = `incremental_${consumerId}_${Date.now()}.csv`;

  exportService.startIncrementalExport(jobId, consumerId, filename);

  return res.status(202).json({
    jobId,
    status: 'started',
    exportType: 'incremental',
    outputFilename: filename
  });
};

exports.deltaExport = async (req, res) => {
  const consumerId = req.header('X-Consumer-ID');

  if (!consumerId) {
    return res.status(400).json({
      error: 'X-Consumer-ID header is required'
    });
  }

  const { v4: uuidv4 } = require('uuid');

  const jobId = uuidv4();

  const filename = `delta_${consumerId}_${Date.now()}.csv`;

  exportService.startDeltaExport(jobId, consumerId, filename);

  return res.status(202).json({
    jobId,
    status: 'started',
    exportType: 'delta',
    outputFilename: filename
  });
};