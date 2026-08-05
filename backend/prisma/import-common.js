// Shared config/helpers for the Prisma content-import scripts
// (import-content.js and import-notes.js). Keeps the DB client, subject
// catalogue and string helpers in one place so both pipelines stay
// consistent and never duplicate setup.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

export const prisma = new PrismaClient();

// ── Subject catalogue (name / type / icon / theme) ────────────────────────

export const SUBJECTS = {
  physics: { name: 'Physics', subjectType: 'science_math', icon: 'orbit', themeColor: '#38bdf8' },
  chemistry: { name: 'Chemistry', subjectType: 'science_math', icon: 'flask', themeColor: '#34d399' },
  mathematics: { name: 'Mathematics', subjectType: 'science_math', icon: 'ruler', themeColor: '#a78bfa' },
  biology: { name: 'Biology', subjectType: 'biology', icon: 'dna', themeColor: '#2dd4bf' },
  english: { name: 'English', subjectType: 'english', icon: 'book', themeColor: '#fbbf24' },
  nepali: { name: 'Nepali', subjectType: 'nepali', icon: 'pen', themeColor: '#fb7185' },
  loksewa: { name: 'Loksewa Knowledge', subjectType: 'general_knowledge', icon: 'scale', themeColor: '#f59e0b' },
  'general-knowledge': { name: 'General Knowledge', subjectType: 'general_knowledge', icon: 'globe', themeColor: '#22d3ee' },
};

// ── Small helpers ─────────────────────────────────────────────────────────

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

export function humanize(name) {
  return String(name)
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncate(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function loadJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}
