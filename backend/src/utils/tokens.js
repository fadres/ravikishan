import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, accessLevel: user.accessLevel ?? 3 },
    env.jwtAccessSecret,
    { expiresIn: env.accessTtl },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Opaque one-time tokens for email verification / password reset. The raw
// token is sent to the user; only its hash is stored in the database so a
// leaked table never exposes usable tokens.
export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
