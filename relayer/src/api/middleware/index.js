/**
 * Middleware Configuration
 * Centralizes all Express middleware setup
 */

const cors = require('cors');
const helmet = require('helmet');
const express = require('express');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../../utils/logger');
const { DEFAULT_CONFIG } = require('../../config/constants');

/**
 * Setup rate limiter
 */
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX) || DEFAULT_CONFIG.RATE_LIMIT_MAX,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW) || DEFAULT_CONFIG.RATE_LIMIT_WINDOW,
});

/**
 * Rate limiting middleware
 */
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    logger.warning('Rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
    res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: rejRes.msBeforeNext
    });
  }
};

/**
 * Request logging middleware
 */
const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel](`${req.method} ${req.path} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      ip: req.ip
    });
  });
  
  next();
};

/**
 * Error handling middleware
 */
const errorHandlingMiddleware = (err, req, res, next) => {
  logger.errorWithStack('Unhandled API error', err, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Don't leak error details in production
  const errorResponse = process.env.NODE_ENV === 'production' 
    ? { error: 'Internal server error' }
    : { error: err.message, stack: err.stack };
  
  res.status(500).json(errorResponse);
};

/**
 * 404 handler middleware
 */
const notFoundMiddleware = (req, res) => {
  logger.warning('Endpoint not found', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

/**
 * Helmet security configuration
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

/**
 * Health check bypass middleware (skip rate limiting for health checks)
 */
const healthCheckBypassMiddleware = (req, res, next) => {
  if (req.path.startsWith('/health')) {
    return next();
  }
  return rateLimitMiddleware(req, res, next);
};

/**
 * Request validation middleware
 */
const requestValidationMiddleware = (req, res, next) => {
  // Add request ID for tracking
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Validate JSON payload size
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    logger.warning('Request payload too large', {
      contentLength,
      maxSize,
      ip: req.ip,
      path: req.path
    });
    return res.status(413).json({ error: 'Payload too large' });
  }
  
  next();
};

/**
 * Setup all middleware for Express app
 * @param {express.Application} app - Express app instance
 */
function setupMiddleware(app) {
  // Security middleware
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  
  // Request parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Custom middleware
  app.use(requestValidationMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(healthCheckBypassMiddleware);
  
  logger.info('✅ Middleware configured successfully');
}

/**
 * Setup error handling middleware (should be called last)
 * @param {express.Application} app - Express app instance
 */
function setupErrorHandling(app) {
  // 404 handler
  app.use(notFoundMiddleware);
  
  // Error handler
  app.use(errorHandlingMiddleware);
  
  logger.info('✅ Error handling middleware configured');
}

module.exports = {
  setupMiddleware,
  setupErrorHandling,
  rateLimitMiddleware,
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  notFoundMiddleware,
  healthCheckBypassMiddleware,
  requestValidationMiddleware
}; 