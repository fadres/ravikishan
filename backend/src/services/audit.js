import { prisma } from '../config/db.js';

// Append a row to the audit trail. Never throws — audit failures must not
// break the main request.
export async function recordAudit(user, action, targetType, targetId, detail) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        action,
        targetType,
        targetId: targetId ?? null,
        detail: detail ?? undefined,
      },
    });
  } catch (err) {
    console.error('audit log write failed:', err);
  }
}
