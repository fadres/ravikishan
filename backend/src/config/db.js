// ─────────────────────────────────────────────────────────────────────────
// Multi-section boundary — read before touching this file.
//
// This codebase follows a multi-section architecture: each study track
// (Class 11 today; Class 12 and others in future) is an independent section
// with its OWN database, import pipeline, classifier and local AI, while
// accounts, progress, gamification, notifications and admin stay GLOBAL.
//
// `prisma` below is the GLOBAL client. Section-scoped clients are created
// via prismaForSection() and keyed by the registry in
// src/lib/sections.config.js — every future section gets a brand-new Neon
// project and must NEVER connect to or depend on NEON_CLASS11_URL.
//
// Full design + "how to add a new section" checklist:
//   see ARCHITECTURE.md at the repo root.
// ─────────────────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
import { requireSection } from '../lib/sections.config.js';

export const prisma = new PrismaClient();

// ── Per-section clients ──────────────────────────────────────────────────
// Each section resolves its OWN Prisma client from the section registry.
// Today every section points at the same connection (NEON_CLASS11_URL alias
// of DATABASE_URL); a future section's entry carries its own brand-new Neon
// URL, so a client here can never touch another section's data. Clients are
// created lazily and cached — never one per request.

const sectionClients = new Map();

export function createSectionPrisma(dbUrl) {
  if (!dbUrl) {
    throw new Error(
      'Section DB URL is not configured — set NEON_CLASS11_URL (or DATABASE_URL) per ARCHITECTURE.md',
    );
  }
  return new PrismaClient({ datasourceUrl: dbUrl });
}

/**
 * Resolve the Prisma client for a section id from the registry.
 * Throws UNKNOWN_SECTION for unregistered ids (fail-fast — never falls
 * back to another section's database).
 */
export function prismaForSection(sectionId) {
  const section = requireSection(sectionId);
  if (!sectionClients.has(section.id)) {
    sectionClients.set(section.id, createSectionPrisma(section.dbUrl));
  }
  return sectionClients.get(section.id);
}
