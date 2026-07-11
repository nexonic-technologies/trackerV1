/**
 * Request Queue Manager
 * Prevents race conditions by queuing concurrent requests per device/user
 * Similar to AWS SQS with FIFO ordering per partition key (device fingerprint)
 */

import { getFingerprintKey } from '../utils/deviceFingerprint.js';

class RequestQueue {
  constructor(options = {}) {
    this.queues = new Map(); // fingerprint -> queue array
    this.processing = new Map(); // fingerprint -> isProcessing
    this.metrics = new Map(); // fingerprint -> metrics
    
    this.config = {
      maxConcurrentPerDevice: options.maxConcurrentPerDevice || 1,
      maxQueueSize: options.maxQueueSize || 100,
      requestTimeout: options.requestTimeout || 30000, // 30 seconds
      cleanupInterval: options.cleanupInterval || 60 * 60 * 1000
    };

    this.startCleanup();
  }

  /**
   * Queue a request for processing
   */
  async enqueue(fingerprint, handler, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      timeout = this.config.requestTimeout,
      metadata = {}
    } = options;

    // Initialize queue if needed
    if (!this.queues.has(fingerprint)) {
      this.queues.set(fingerprint, []);
      this.processing.set(fingerprint, 0);
      this.metrics.set(fingerprint, {
        queued: 0,
        processed: 0,
        failed: 0,
        totalWaitTime: 0
      });
    }

    const queue = this.queues.get(fingerprint);

    // Check queue size
    if (queue.length >= this.config.maxQueueSize) {
      return {
        success: false,
        reason: 'queue_full',
        message: `Queue full for device ${fingerprint}`
      };
    }

    // Create queue entry
    const entry = {
      id: `${fingerprint}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      handler,
      priority,
      timeout,
      metadata,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      status: 'queued',
      result: null,
      error: null
    };

    // Insert based on priority
    if (priority === 'high') {
      queue.unshift(entry);
    } else if (priority === 'low') {
      queue.push(entry);
    } else {
      queue.push(entry);
    }

    const metrics = this.metrics.get(fingerprint);
    metrics.queued++;

    // Process if not already processing
    this.processNext(fingerprint);

    return {
      success: true,
      queueId: entry.id,
      position: queue.indexOf(entry),
      queueLength: queue.length
    };
  }

  /**
   * Process next request in queue
   */
  async processNext(fingerprint) {
    const queue = this.queues.get(fingerprint);
    const processing = this.processing.get(fingerprint);

    if (!queue || queue.length === 0 || processing >= this.config.maxConcurrentPerDevice) {
      return;
    }

    const entry = queue.shift();
    this.processing.set(fingerprint, processing + 1);
    entry.status = 'processing';
    entry.startedAt = Date.now();

    try {
      // Execute with timeout
      const result = await Promise.race([
        entry.handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), entry.timeout)
        )
      ]);

      entry.status = 'completed';
      entry.completedAt = Date.now();
      entry.result = result;

      const metrics = this.metrics.get(fingerprint);
      metrics.processed++;
      metrics.totalWaitTime += entry.startedAt - entry.createdAt;

      return result;
    } catch (error) {
      entry.status = 'failed';
      entry.completedAt = Date.now();
      entry.error = error.message;

      const metrics = this.metrics.get(fingerprint);
      metrics.failed++;

      console.error(`Queue error for ${fingerprint}: ${error.message}`);
    } finally {
      // Decrement processing counter
      const newProcessing = Math.max(0, this.processing.get(fingerprint) - 1);
      this.processing.set(fingerprint, newProcessing);

      // Process next in queue
      setImmediate(() => this.processNext(fingerprint));
    }
  }

  /**
   * Get queue status for a fingerprint
   */
  getStatus(fingerprint) {
    const queue = this.queues.get(fingerprint) || [];
    const processing = this.processing.get(fingerprint) || 0;
    const metrics = this.metrics.get(fingerprint) || {
      queued: 0,
      processed: 0,
      failed: 0,
      totalWaitTime: 0
    };

    return {
      fingerprint,
      queueLength: queue.length,
      processing,
      metrics,
      avgWaitTime: metrics.processed > 0 ? Math.round(metrics.totalWaitTime / metrics.processed) : 0,
      queue: queue.map(e => ({
        id: e.id,
        priority: e.priority,
        status: e.status,
        createdAt: new Date(e.createdAt).toISOString()
      }))
    };
  }

  /**
   * Get queue entry details
   */
  getEntry(fingerprint, queueId) {
    const queue = this.queues.get(fingerprint) || [];
    const entry = queue.find(e => e.id === queueId);

    if (!entry) {
      return null;
    }

    return {
      id: entry.id,
      status: entry.status,
      priority: entry.priority,
      createdAt: new Date(entry.createdAt).toISOString(),
      startedAt: entry.startedAt ? new Date(entry.startedAt).toISOString() : null,
      completedAt: entry.completedAt ? new Date(entry.completedAt).toISOString() : null,
      waitTime: (entry.startedAt || Date.now()) - entry.createdAt,
      processingTime: entry.completedAt ? entry.completedAt - (entry.startedAt || Date.now()) : null,
      result: entry.result,
      error: entry.error
    };
  }

  /**
   * Clear queue for a fingerprint
   */
  clear(fingerprint) {
    const queue = this.queues.get(fingerprint) || [];
    const clearedCount = queue.length;
    
    this.queues.set(fingerprint, []);
    this.processing.set(fingerprint, 0);
    
    return clearedCount;
  }

  /**
   * Get global statistics
   */
  getStats() {
    let totalQueued = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalProcessing = 0;

    for (const metrics of this.metrics.values()) {
      totalQueued += metrics.queued;
      totalProcessed += metrics.processed;
      totalFailed += metrics.failed;
    }

    for (const count of this.processing.values()) {
      totalProcessing += count;
    }

    return {
      trackedDevices: this.queues.size,
      totalQueued,
      totalProcessed,
      totalFailed,
      currentlyProcessing: totalProcessing,
      avgQueueSize: this.queues.size > 0 
        ? Array.from(this.queues.values()).reduce((sum, q) => sum + q.length, 0) / this.queues.size 
        : 0,
      successRate: totalQueued > 0 ? ((totalProcessed / (totalProcessed + totalFailed)) * 100).toFixed(2) + '%' : 'N/A'
    };
  }

  /**
   * Cleanup old queue records
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.cleanupInterval;

      for (const [fingerprint, queue] of this.queues.entries()) {
        // Remove if no activity
        const metrics = this.metrics.get(fingerprint);
        if (queue.length === 0 && metrics && (metrics.queued === 0 || now - (queue[queue.length - 1]?.completedAt || 0) > maxAge)) {
          this.queues.delete(fingerprint);
          this.processing.delete(fingerprint);
          this.metrics.delete(fingerprint);
        }
      }
    }, this.config.cleanupInterval);

    this.cleanupTimer.unref();
  }

  /**
   * Stop cleanup timer
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Global queue instance
const requestQueue = new RequestQueue({
  maxConcurrentPerDevice: 2, // Allow up to 2 concurrent requests per device
  maxQueueSize: 100,
  requestTimeout: 30000
});

/**
 * Express middleware for request queueing
 */
export const queueMiddleware = (options = {}) => {
  const {
    enabled = false, // Disabled by default, enable for specific endpoints
    keyGenerator = (req) => getFingerprintKey(req),
    shouldQueue = (req) => false, // Override this per route
    onQueueFull = (req, res) => {
      res.status(503).json({
        success: false,
        message: 'Server queue full, please retry later'
      });
    }
  } = options;

  return (req, res, next) => {
    if (!enabled || !shouldQueue(req)) {
      return next();
    }

    const fingerprint = keyGenerator(req);
    const status = requestQueue.enqueue(fingerprint, () => {
      // This will be called when request is at front of queue
      return new Promise((resolve, reject) => {
        // We'll wrap the response to capture it
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = function(data) {
          resolve({ data, method: 'json' });
          return originalJson(data);
        };

        res.send = function(data) {
          resolve({ data, method: 'send' });
          return originalSend(data);
        };

        // Continue with normal request processing
        next();
      });
    }, { 
      metadata: {
        route: req.originalUrl,
        method: req.method,
        action: req.params.action,
        model: req.params.model
      }
    });

    if (!status.success) {
      return onQueueFull(req, res);
    }

    // Attach queue info to request
    req.queue = {
      queueId: status.queueId,
      position: status.position,
      queueLength: status.queueLength
    };

    // Add response headers
    res.set('X-Queue-Position', String(status.position));
    res.set('X-Queue-Length', String(status.queueLength));
  };
};

/**
 * Wrap a handler in queue processing
 */
export const wrapInQueue = (fingerprint, handler, options = {}) => {
  return requestQueue.enqueue(fingerprint, handler, options);
};

export { requestQueue };
export default requestQueue;
