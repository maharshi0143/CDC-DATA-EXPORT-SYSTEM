/**
 * Authentication Middleware
 * Validates API keys for secure access to export endpoints
 */

const logger = require('../utils/logger');

// Load valid API keys from environment variable
const VALID_API_KEYS = new Set(
  (process.env.VALID_API_KEYS || '').split(',').filter(key => key.length > 0)
);

/**
 * Validate API Key middleware
 * Checks X-API-Key header against configured valid keys
 */
exports.validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');

  // Check if API key is provided
  if (!apiKey) {
    logger.warn({
      event: 'auth_failed',
      reason: 'missing_api_key',
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'X-API-Key header is required'
    });
  }

  // Validate API key
  if (!VALID_API_KEYS.has(apiKey)) {
    logger.warn({
      event: 'auth_failed',
      reason: 'invalid_api_key',
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  // Log successful authentication
  logger.info({
    event: 'auth_success',
    ip: req.ip,
    path: req.path
  });

  next();
};
