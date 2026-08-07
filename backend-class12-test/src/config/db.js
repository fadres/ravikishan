// Single Prisma client for this section's OWN database. There is no global
// client here and no per-section registry: this service is one section.
// `prismaForSection` exists only so section-shaped code (import-notes) reads
// identically to the global backend's — it resolves the service's own
// section id to `prisma` and fails fast for anything else.
import { PrismaClient } from '@prisma/client';
import { requireSection } from '../lib/section.js';

export const prisma = new PrismaClient();

/**
 * Resolve the client for a section id. Only this service's own section id
 * is valid — anything else throws UNKNOWN_SECTION (fail-fast, never falls
 * back to another section's database).
 */
export function prismaForSection(sectionId) {
  requireSection(sectionId);
  return prisma;
}
