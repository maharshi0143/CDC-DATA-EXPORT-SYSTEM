/**
 * Input Validation Middleware
 * Validates and sanitizes user inputs
 */

const logger = require('../utils/logger');

/**
 * Validate Consumer ID middleware
 * Ensures consumer ID follows proper format and constraints
 */
exports.validateConsumerId = (req, res, next) => {
  const consumerId = req.header('X-Consumer-ID');

  // Check if consumer ID is provided
  if (!consumerId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'X-Consumer-ID header is required'
    });
  }

  // Validate format: alphanumeric, hyphens, underscores, max 255 chars
  const consumerIdPattern = /^[a-zA-Z0-9-_]{1,255}$/;
  
  if (!consumerIdPattern.test(consumerId)) {
    logger.warn({
      event: 'validation_failed',
      field: 'consumer_id',
      value: consumerId,
      ip: req.ip
    });
    
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid consumer ID format. Use alphanumeric characters, hyphens, or underscores (max 255 chars)'
    });
  }

  // Attach validated consumer ID to request for downstream use
  req.consumerId = consumerId;

  next();
};

/**
 * Sanitize inputs to prevent injection attacks
 * Additional layer of security even though we use parameterized queries
 */
exports.sanitizeInputs = (req, res, next) => {
  // Check for common SQL injection patterns in headers
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i
  ];

  const consumerId = req.header('X-Consumer-ID');
  
  if (consumerId) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(consumerId)) {
        logger.error({
          event: 'potential_injection_attempt',
          field: 'consumer_id',
          value: consumerId,
          ip: req.ip,
          path: req.path
        });
        
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid input detected'
        });
      }
    }
  }

  next();
};
