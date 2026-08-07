import { verifyAccessToken } from '../utils/tokens.js';

// ── Payload-only verification ─────────────────────────────────────────────
// This section service has NO user table and NO access to the global
// database. Identity comes entirely from the access token issued by the
// GLOBAL auth service (shared JWT_ACCESS_SECRET). Verification is local
// (no network, no DB), so this service keeps serving content even while
// the global service is down.
//
// Trade-off: role/accessLevel changes and user deletion take effect at the
// next global token refresh (access tokens are short-lived — 15m by
// default), and this service can never distinguish a revoked user from an
// active one. That is the intended design (see ARCHITECTURE.md §6).
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email ?? null,
        role: payload.role ?? 'guest',
        accessLevel: payload.accessLevel ?? 3,
        verifiedBy: 'shared-jwt',
      };
    } catch {
      // invalid/expired token → treated as anonymous
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// Role gate based on the token payload (this service has no user table).
// Anonymous users fail the role check with 403.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
