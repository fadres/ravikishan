// Zod validation middleware. Validates the payload and attaches the cleaned
// result to req.validated; for body payloads the sanitized value also replaces
// req.body so downstream code reads one consistent shape.

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.validated = result.data;
    if (source === 'body') req.body = result.data;
    next();
  };
}
