import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// This service only VERIFIES tokens — the global auth service signs them.
// Keeping the same module name as the global backend's utils/tokens.js
// keeps section-shaped code identical; never add signing here.
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}
