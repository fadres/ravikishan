import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { startSyncLoop, stopSyncLoop } from './services/progressSync.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Ravikishan section API (${env.sectionId}) listening on http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`Progress-sync: ${env.progressSyncUrl ? `pushing to ${env.progressSyncUrl}` : 'DISABLED (PROGRESS_SYNC_URL not set)'}`);
});

startSyncLoop();

async function shutdown() {
  console.log('Shutting down…');
  stopSyncLoop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
