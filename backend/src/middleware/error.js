export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(JSON.stringify({
    level: 'error',
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id ?? null,
    timestamp: new Date().toISOString(),
  }));
  res.status(500).json({ error: 'Internal server error' });
}
