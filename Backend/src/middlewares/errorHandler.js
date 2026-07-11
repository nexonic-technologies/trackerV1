// middlewares/errorHandler.js
import ErrorLog from '../models/ErrorLog.js';

export const errorHandler = async (err, req, res, next) => {
  // Log the error to console for server-side visibility
  console.error('🔴 API Error:', err);

  try {
    // save to DB
    await ErrorLog.create({
      message: err.message,
      stack: err.stack,
      method: req.method,
      route: req.originalUrl,
      user: req.user ? req.user.id : null, // if auth attached user
      ip: req.ip,
      requestId: req.id, // Add Request ID for tracing
    });
  } catch (logError) {
    console.error('Failed to save error log:', logError);
  }

  // return standard response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    requestId: req.id, // Help frontend developers report bugs
  });
};