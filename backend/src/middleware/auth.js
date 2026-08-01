import { verifyAccessToken } from '../utils/tokens.js';
import { prisma } from '../config/db.js';

// Attaches req.user when a valid Bearer token is present; never rejects.
// The user row is loaded fresh from the DB so role/accessLevel changes
// (e.g. an owner approving a member) take effect immediately, and tokens of
// deleted users stop working.
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          accessLevel: true,
          isApproved: true,
        },
      });
      if (user) req.user = user;
    } catch {
      // invalid/expired token or deleted user → treated as anonymous
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
