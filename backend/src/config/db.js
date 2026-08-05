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

export const prisma = new PrismaClient();
