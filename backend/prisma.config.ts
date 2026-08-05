// Prisma CLI configuration — multi-section boundary (see ARCHITECTURE.md).
//
// The Prisma schema is split across multiple files in the `prisma/` folder:
//   • prisma/schema.prisma          — generator + datasource + shared enums
//   • prisma/schema.global.prisma   — GLOBAL tables
//   • prisma/schema.class11.prisma  — CLASS 11 section content tables
//
// Multi-file schemas REQUIRE pointing `schema` at the directory (not at a
// single file) — otherwise Prisma silently reads only schema.prisma and the
// generated client has none of the models from the other files.
//
// Future sections add their own schema.<section>.prisma here; only a second
// section's schema would point at a different DATABASE_URL.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
});
