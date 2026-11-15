// Centralized error handler middleware
function errorHandler(err, req, res, next) {
  // Prevent duplicate response if headers are already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific known error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload received' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds limit of 5MB' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // In production / test, do not leak stack traces or internal paths
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction ? 'An unexpected server error occurred' : (err.message || 'Internal server error');

  if (process.env.NODE_ENV !== 'test' && !req.isTest) {
    console.error('Unhandled server error:', err);
  }

  res.status(500).json({ error: errorMessage });
}

module.exports = { errorHandler };
