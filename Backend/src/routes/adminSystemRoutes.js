/**
 * Admin endpoints for managing rate limiting, queues, and race condition locks
 * Provides monitoring and control for device fingerprints and request queuing
 */

import express from 'express';
import { rateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { requestQueue } from '../services/requestQueue.js';
import { raceConditionHandler } from '../services/raceConditionHandler.js';
import { getDeviceInfo } from '../utils/deviceFingerprint.js';

const router = express.Router();

/**
 * Middleware to ensure admin access
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ============================================
// RATE LIMITING ENDPOINTS
// ============================================

/**
 * GET /api/admin/rate-limit/stats
 * Get global rate limiting statistics
 */
router.get('/rate-limit/stats', requireAdmin, (req, res) => {
  const stats = rateLimiter.getStats();
  
  res.json({
    success: true,
    data: {
      ...stats,
      description: 'Global rate limiting statistics'
    }
  });
});

/**
 * GET /api/admin/rate-limit/status/:fingerprint
 * Get rate limit status for a specific device
 */
router.get('/rate-limit/status/:fingerprint', requireAdmin, (req, res) => {
  const { fingerprint } = req.params;
  const status = rateLimiter.getStatus(fingerprint);

  res.json({
    success: true,
    data: status
  });
});

/**
 * POST /api/admin/rate-limit/reset/:fingerprint
 * Reset rate limit for a device
 */
router.post('/rate-limit/reset/:fingerprint', requireAdmin, (req, res) => {
  const { fingerprint } = req.params;
  rateLimiter.reset(fingerprint);

  res.json({
    success: true,
    message: `Rate limit reset for device ${fingerprint}`
  });
});

/**
 * POST /api/admin/rate-limit/whitelist
 * Add fingerprint to whitelist
 */
router.post('/rate-limit/whitelist', requireAdmin, (req, res) => {
  const { fingerprint, reason } = req.body;

  if (!fingerprint) {
    return res.status(400).json({
      success: false,
      message: 'Fingerprint required'
    });
  }

  // Add to whitelist in config
  rateLimiter.config.whitelist = rateLimiter.config.whitelist || [];
  if (!rateLimiter.config.whitelist.includes(fingerprint)) {
    rateLimiter.config.whitelist.push(fingerprint);
  }

  res.json({
    success: true,
    message: `Device ${fingerprint} added to whitelist`,
    reason: reason || 'No reason provided'
  });
});

/**
 * GET /api/admin/rate-limit/config
 * Get current rate limit configuration
 */
router.get('/rate-limit/config', requireAdmin, (req, res) => {
  const config = {
    requestsPerSecond: rateLimiter.config.requestsPerSecond,
    requestsPerMinute: rateLimiter.config.requestsPerMinute,
    requestsPerHour: rateLimiter.config.requestsPerHour,
    burstAllowance: rateLimiter.config.burstAllowance,
    routeOverrides: rateLimiter.config.routeOverrides
  };

  res.json({
    success: true,
    data: config
  });
});

/**
 * PUT /api/admin/rate-limit/config
 * Update rate limit configuration
 */
router.put('/rate-limit/config', requireAdmin, (req, res) => {
  const { requestsPerSecond, requestsPerMinute, requestsPerHour, burstAllowance, routeOverrides } = req.body;

  if (requestsPerSecond) rateLimiter.config.requestsPerSecond = requestsPerSecond;
  if (requestsPerMinute) rateLimiter.config.requestsPerMinute = requestsPerMinute;
  if (requestsPerHour) rateLimiter.config.requestsPerHour = requestsPerHour;
  if (burstAllowance) rateLimiter.config.burstAllowance = burstAllowance;
  if (routeOverrides) rateLimiter.config.routeOverrides = { ...rateLimiter.config.routeOverrides, ...routeOverrides };

  res.json({
    success: true,
    message: 'Rate limit configuration updated',
    data: rateLimiter.config
  });
});

// ============================================
// REQUEST QUEUE ENDPOINTS
// ============================================

/**
 * GET /api/admin/queue/stats
 * Get global queue statistics
 */
router.get('/queue/stats', requireAdmin, (req, res) => {
  const stats = requestQueue.getStats();

  res.json({
    success: true,
    data: {
      ...stats,
      description: 'Global request queue statistics'
    }
  });
});

/**
 * GET /api/admin/queue/status/:fingerprint
 * Get queue status for a specific device
 */
router.get('/queue/status/:fingerprint', requireAdmin, (req, res) => {
  const { fingerprint } = req.params;
  const status = requestQueue.getStatus(fingerprint);

  res.json({
    success: true,
    data: status
  });
});

/**
 * GET /api/admin/queue/entry/:fingerprint/:queueId
 * Get specific queue entry details
 */
router.get('/queue/entry/:fingerprint/:queueId', requireAdmin, (req, res) => {
  const { fingerprint, queueId } = req.params;
  const entry = requestQueue.getEntry(fingerprint, queueId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Queue entry not found'
    });
  }

  res.json({
    success: true,
    data: entry
  });
});

/**
 * POST /api/admin/queue/clear/:fingerprint
 * Clear queue for a device
 */
router.post('/queue/clear/:fingerprint', requireAdmin, (req, res) => {
  const { fingerprint } = req.params;
  const clearedCount = requestQueue.clear(fingerprint);

  res.json({
    success: true,
    message: `Cleared ${clearedCount} items from queue`,
    clearedCount
  });
});

/**
 * GET /api/admin/queue/config
 * Get queue configuration
 */
router.get('/queue/config', requireAdmin, (req, res) => {
  const config = {
    maxConcurrentPerDevice: requestQueue.config.maxConcurrentPerDevice,
    maxQueueSize: requestQueue.config.maxQueueSize,
    requestTimeout: requestQueue.config.requestTimeout
  };

  res.json({
    success: true,
    data: config
  });
});

/**
 * PUT /api/admin/queue/config
 * Update queue configuration
 */
router.put('/queue/config', requireAdmin, (req, res) => {
  const { maxConcurrentPerDevice, maxQueueSize, requestTimeout } = req.body;

  if (maxConcurrentPerDevice !== undefined) requestQueue.config.maxConcurrentPerDevice = maxConcurrentPerDevice;
  if (maxQueueSize !== undefined) requestQueue.config.maxQueueSize = maxQueueSize;
  if (requestTimeout !== undefined) requestQueue.config.requestTimeout = requestTimeout;

  res.json({
    success: true,
    message: 'Queue configuration updated',
    data: requestQueue.config
  });
});

// ============================================
// RACE CONDITION / LOCK ENDPOINTS
// ============================================

/**
 * GET /api/admin/locks/stats
 * Get global lock statistics
 */
router.get('/locks/stats', requireAdmin, (req, res) => {
  const stats = raceConditionHandler.getStats();

  res.json({
    success: true,
    data: {
      ...stats,
      description: 'Global lock and version statistics'
    }
  });
});

/**
 * GET /api/admin/locks/status/:docId
 * Get lock status for a specific document
 */
router.get('/locks/status/:docId', requireAdmin, (req, res) => {
  const { docId } = req.params;
  const status = raceConditionHandler.getLockStatus(docId);

  res.json({
    success: true,
    data: status
  });
});

/**
 * GET /api/admin/locks/all
 * Get all active locks
 */
router.get('/locks/all', requireAdmin, (req, res) => {
  const locks = raceConditionHandler.getAllLocks();

  res.json({
    success: true,
    count: locks.length,
    data: locks
  });
});

/**
 * POST /api/admin/locks/force-release/:docId
 * Force release a lock (admin use only)
 */
router.post('/locks/force-release/:docId', requireAdmin, (req, res) => {
  const { docId } = req.params;
  const { reason } = req.body;

  const result = raceConditionHandler.forceRelease(docId);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      message: result.reason
    });
  }

  res.json({
    success: true,
    message: `Lock released for document ${docId}`,
    reason: reason || 'No reason provided',
    lockId: result.lockId
  });
});

/**
 * GET /api/admin/locks/config
 * Get lock configuration
 */
router.get('/locks/config', requireAdmin, (req, res) => {
  const config = {
    lockTimeout: raceConditionHandler.config.lockTimeout,
    maxRetries: raceConditionHandler.config.maxRetries,
    retryDelay: raceConditionHandler.config.retryDelay
  };

  res.json({
    success: true,
    data: config
  });
});

/**
 * PUT /api/admin/locks/config
 * Update lock configuration
 */
router.put('/locks/config', requireAdmin, (req, res) => {
  const { lockTimeout, maxRetries, retryDelay } = req.body;

  if (lockTimeout !== undefined) raceConditionHandler.config.lockTimeout = lockTimeout;
  if (maxRetries !== undefined) raceConditionHandler.config.maxRetries = maxRetries;
  if (retryDelay !== undefined) raceConditionHandler.config.retryDelay = retryDelay;

  res.json({
    success: true,
    message: 'Lock configuration updated',
    data: raceConditionHandler.config
  });
});

// ============================================
// COMBINED HEALTH CHECK
// ============================================

/**
 * GET /api/admin/system/health
 * Get overall system health regarding rate limiting, queues, and locks
 */
router.get('/system/health', requireAdmin, (req, res) => {
  const health = {
    rateLimit: rateLimiter.getStats(),
    queue: requestQueue.getStats(),
    locks: raceConditionHandler.getStats(),
    timestamp: new Date().toISOString(),
    status: 'healthy'
  };

  // Determine overall health
  if (health.rateLimit.blockedDevices > 100) {
    health.status = 'warning';
    health.warnings = health.warnings || [];
    health.warnings.push('High number of blocked devices');
  }

  if (health.queue.currentlyProcessing > 1000) {
    health.status = 'warning';
    health.warnings = health.warnings || [];
    health.warnings.push('High queue processing load');
  }

  if (health.locks.activeLocks > 500) {
    health.status = 'warning';
    health.warnings = health.warnings || [];
    health.warnings.push('High number of active locks');
  }

  res.json({
    success: true,
    data: health
  });
});

/**
 * POST /api/admin/system/reset
 * Emergency reset (clear all queues, locks, etc.)
 */
router.post('/system/reset', requireAdmin, (req, res) => {
  const { confirmReset } = req.body;

  if (confirmReset !== true) {
    return res.status(400).json({
      success: false,
      message: 'Confirmation required: send { confirmReset: true }'
    });
  }

  // Clear all queues
  const queuesCleared = Array.from(requestQueue.queues.keys()).map(fp => {
    requestQueue.clear(fp);
    return fp;
  }).length;

  // Clear all locks
  const locksCleared = Array.from(raceConditionHandler.locks.keys()).length;
  raceConditionHandler.locks.clear();

  res.json({
    success: true,
    message: 'System reset completed',
    data: {
      queuesCleared,
      locksCleared,
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
