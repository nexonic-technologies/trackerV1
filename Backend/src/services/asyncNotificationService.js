import createQueue from '../utils/queueFactory.js';

class AsyncNotificationService {
  constructor() {
    this.pushQueue = createQueue('push notifications');
    this.emailQueue = createQueue('email notifications');

    this.setupProcessors();
    this.setupEventHandlers();
  }

  setupProcessors() {
    // Push notification processor
    this.pushQueue.process('send-push', 10, async (job) => {
      const { userId, title, body, data } = job.data;
      return await this.processPushNotification(userId, title, body, data);
    });

    // Email processor
    this.emailQueue.process('send-email', 5, async (job) => {
      const { to, subject, body, template } = job.data;
      return await this.processEmail(to, subject, body, template);
    });

    // Batch notification processor
    this.pushQueue.process('batch-push', 5, async (job) => {
      const { notifications } = job.data;
      return await this.processBatchPush(notifications);
    });
  }

  setupEventHandlers() {
    this.pushQueue.on('error', (err) => {
      console.warn('⚠️ Push Queue Redis error:', err.message);
    });

    this.emailQueue.on('error', (err) => {
      console.warn('⚠️ Email Queue Redis error:', err.message);
    });

    this.pushQueue.on('completed', (job) => {
      // console.log(`Push notification job ${job.id} completed`);
    });

    this.pushQueue.on('failed', (job, err) => {
      console.error(`Push notification job ${job.id} failed:`, err);
    });

    this.emailQueue.on('completed', (job) => {
      // console.log(`Email job ${job.id} completed`);
    });

    this.emailQueue.on('failed', (job, err) => {
      console.error(`Email job ${job.id} failed:`, err);
    });
  }

  // Queue push notification (non-blocking)
  async queuePushNotification(userId, title, body, data = {}, options = {}) {
    try {
      // Check notification preferences
      try {
        const { default: models } = await import('../models/Collection.js');
        const prefs = await models.notificationpreferences.findOne({ employeeId: userId }).lean();
        if (prefs) {
          if (data.type === 'task_status' && prefs.muteTaskStatusChanges) return { success: true, ignored: true };
          if (data.type === 'task_assignment' && prefs.muteTaskAssignments) return { success: true, ignored: true };
          if (data.type === 'task_comment') {
            if (prefs.muteTaskComments) return { success: true, ignored: true };
            if (prefs.onlyMentions && (!data.mentions || !data.mentions.includes(userId.toString()))) {
              return { success: true, ignored: true };
            }
          }
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      }

      const job = await this.pushQueue.add('send-push', {
        userId,
        title,
        body,
        data,
        timestamp: Date.now()
      }, {
        delay: options.delay || 0,
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 10,
        removeOnFail: 5
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Error queuing push notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Queue email (non-blocking)
  async queueEmail(to, subject, body, template = null, options = {}) {
    try {
      const job = await this.emailQueue.add('send-email', {
        to,
        subject,
        body,
        template,
        timestamp: Date.now()
      }, {
        delay: options.delay || 0,
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 10,
        removeOnFail: 5
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Error queuing email:', error);
      return { success: false, error: error.message };
    }
  }

  // Queue batch notifications
  async queueBatchNotifications(notifications, options = {}) {
    try {
      const job = await this.pushQueue.add('batch-push', {
        notifications,
        timestamp: Date.now()
      }, {
        delay: options.delay || 0,
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 5,
        removeOnFail: 3
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Error queuing batch notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Process individual push notification
  async processPushNotification(userId, title, body, data) {
    try {
      // Get user's push tokens from database
      const { default: Session } = await import('../models/Session.js');
      const sessions = await Session.find({
        userId,
        isActive: true,
        pushToken: { $exists: true, $ne: null }
      }).select('pushToken deviceType').lean();

      const userTokens = sessions.map(s => ({
        token: s.pushToken,
        type: s.deviceType
      }));

      if (!userTokens || userTokens.length === 0) {
        return { success: false, reason: 'No push tokens found' };
      }

      // Send to external push service (mock implementation)
      const results = await Promise.allSettled(
        userTokens.map(({ token, type }) =>
          this.sendPushToProvider(token, title, body, data, type)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: successful > 0,
        sent: successful,
        failed,
        total: userTokens.length
      };

    } catch (error) {
      console.error('Error processing push notification:', error);
      throw error;
    }
  }

  // Mock external push service call
  async sendPushToProvider(token, title, body, data, deviceType) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock success/failure (90% success rate)
    if (Math.random() < 0.9) {
      return { success: true, token, messageId: Date.now() };
    } else {
      throw new Error('Push service unavailable');
    }
  }

  // Process batch notifications
  async processBatchPush(notifications) {
    try {
      const results = await Promise.allSettled(
        notifications.map(notif =>
          this.processPushNotification(
            notif.userId,
            notif.title,
            notif.body,
            notif.data
          )
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        processed: notifications.length,
        successful,
        failed
      };

    } catch (error) {
      console.error('Error processing batch notifications:', error);
      throw error;
    }
  }

  // Process email
  async processEmail(to, subject, body, template) {
    try {
      // Mock email service call
      await new Promise(resolve => setTimeout(resolve, 200));

      // Mock success (95% success rate)
      if (Math.random() < 0.95) {
        return {
          success: true,
          messageId: `email_${Date.now()}`,
          to,
          subject
        };
      } else {
        throw new Error('Email service unavailable');
      }

    } catch (error) {
      console.error('Error processing email:', error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const [pushWaiting, pushActive, pushCompleted, pushFailed] = await Promise.all([
        this.pushQueue.getWaiting(),
        this.pushQueue.getActive(),
        this.pushQueue.getCompleted(),
        this.pushQueue.getFailed()
      ]);

      const [emailWaiting, emailActive, emailCompleted, emailFailed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getActive(),
        this.emailQueue.getCompleted(),
        this.emailQueue.getFailed()
      ]);

      return {
        push: {
          waiting: pushWaiting.length,
          active: pushActive.length,
          completed: pushCompleted.length,
          failed: pushFailed.length
        },
        email: {
          waiting: emailWaiting.length,
          active: emailActive.length,
          completed: emailCompleted.length,
          failed: emailFailed.length
        }
      };

    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { error: error.message };
    }
  }

  // Clean old jobs
  async cleanOldJobs() {
    try {
      await Promise.all([
        this.pushQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
        this.pushQueue.clean(24 * 60 * 60 * 1000, 'failed'),
        this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'),
        this.emailQueue.clean(24 * 60 * 60 * 1000, 'failed')
      ]);

      // console.log('✅ Old notification jobs cleaned');
    } catch (error) {
      console.error('Error cleaning old jobs:', error);
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      await Promise.all([
        this.pushQueue.close(),
        this.emailQueue.close()
      ]);
      // console.log('✅ Notification queues closed');
    } catch (error) {
      console.error('Error closing notification queues:', error);
    }
  }
}

export default new AsyncNotificationService();