const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const exportRoutes = require('./routes/exportRoutes');
const { validateApiKey } = require('./middleware/auth');
const { validateConsumerId, sanitizeInputs } = require('./middleware/validation');
const db = require('./config/db');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json({ limit: '10mb' })); // Body parser with size limit

// Rate limiting for export endpoints
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { 
    error: 'Too Many Requests',
    message: 'Too many export requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      event: 'rate_limit_exceeded',
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many export requests from this IP, please try again later'
    });
  }
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // Database connectivity check
  try {
    const startTime = Date.now();
    await db.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    health.checks.database = { 
      status: 'healthy',
      responseTime: `${responseTime}ms`
    };
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = { 
      status: 'unhealthy', 
      error: error.message 
    };
    
    logger.error({
      event: 'health_check_failed',
      component: 'database',
      error: error.message
    });
    
    return res.status(503).json(health);
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  health.checks.memory = {
    status: memUsageMB.heapUsed < 512 ? 'healthy' : 'warning',
    usage: memUsageMB
  };

  // Disk space check
  try {
    const fs = require('fs');
    const stats = fs.statfsSync('/app/output');
    const freeSpace = stats.bfree * stats.bsize;
    const totalSpace = stats.blocks * stats.bsize;
    const usedPercent = ((totalSpace - freeSpace) / totalSpace * 100).toFixed(2);
    
    health.checks.disk = {
      status: usedPercent < 90 ? 'healthy' : 'warning',
      usedPercent: `${usedPercent}%`,
      freeSpaceMB: Math.round(freeSpace / 1024 / 1024)
    };
  } catch (error) {
    health.checks.disk = { 
      status: 'unknown',
      message: 'Unable to check disk space'
    };
  }

  res.json(health);
});

// Apply security and validation middleware to export routes
app.use('/exports', 
  exportLimiter,           // Rate limiting
  validateApiKey,          // API key authentication
  sanitizeInputs,          // Input sanitization
  validateConsumerId,      // Consumer ID validation
  exportRoutes             // Route handlers
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({
    event: 'unhandled_error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

module.exports = app;