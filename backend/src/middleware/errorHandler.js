function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
}

module.exports = { notFound, errorHandler };
