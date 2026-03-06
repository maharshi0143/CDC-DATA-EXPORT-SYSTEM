const express = require('express');
const router = express.Router();

const exportController = require('../controllers/exportController');

router.post('/full', exportController.fullExport);
router.get('/watermark', exportController.getWatermark);
router.post('/incremental', exportController.incrementalExport);
router.post('/delta', exportController.deltaExport);

module.exports = router;