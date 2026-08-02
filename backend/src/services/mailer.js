// Ravikishan mailer — GMail (SMTP) notifications to members when content is
// added or updated. No-op unless SMTP_PASS is configured, so local dev and
// test runs never send mail.

import nodemailer from 'nodemailer';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

let transport = null;

function getTransport() {
  if (!env.smtpPass) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  return transport;
}

const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function layout(title, bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b1120;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#22d3ee,#67e8f9);padding:18px 24px">
          <span style="font-size:18px;font-weight:bold;color:#082f33">Ravikishan Study Notes</span>
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#f1f5f9">${escapeHtml(title)}</h1>
          <div style="font-size:14px;line-height:1.6;color:#cbd5e1">${bodyHtml}</div>
          <p style="margin-top:20px;font-size:13px;color:#64748b">
            <a href="${escapeHtml(env.siteUrl)}" style="color:#22d3ee">Open the study platform →</a>
          </p>
        </td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid #1f2937;font-size:12px;color:#475569">
          You are receiving this because you have member access to Ravikishan Study Notes.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendMail(to, subject, title, bodyHtml) {
  const t = getTransport();
  if (!t) return false;
  try {
    await t.sendMail({
      from: env.mailFrom || env.smtpUser,
      to,
      subject: `[Ravikishan] ${subject}`,
      html: layout(title, bodyHtml),
    });
    return true;
  } catch (err) {
    console.error(`mailer: failed to send to ${to}:`, err.message);
    return false;
  }
}

function actionButton(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#22d3ee,#67e8f9)"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;border-radius:12px;color:#082f33;font-weight:bold;text-decoration:none;font-size:14px">${escapeHtml(label)}</a></td></tr></table>`;
}

// Email verification — sent at registration and on resend.
export async function sendVerificationEmail(to, displayName, token) {
  const url = `${env.siteUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const body = `<p>Hi ${escapeHtml(displayName || 'there')},</p>
<p>Welcome to <strong>Ravikishan Study Notes</strong>. Verify your email address to secure your account, get notified about new content and unlock account recovery.</p>
${actionButton('Verify my email', url)}
<p style="font-size:12px;color:#94a3b8">This link expires in 24 hours. If you did not create this account, you can safely ignore this email.</p>`;
  return sendMail(to, 'Verify your email address', 'Confirm your email', body);
}

// Forgot password — delivers a one-time reset link.
export async function sendPasswordResetEmail(to, displayName, token) {
  const url = `${env.siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const body = `<p>Hi ${escapeHtml(displayName || 'there')},</p>
<p>We received a request to reset your Ravikishan password. Click below to choose a new one:</p>
${actionButton('Reset my password', url)}
<p style="font-size:12px;color:#94a3b8">This link expires in 1 hour and can only be used once. If you did not request this, you can safely ignore this email — your password stays unchanged.</p>`;
  return sendMail(to, 'Reset your password', 'Password reset', body);
}

// Sends to every member (accessLevel 1 or 2, excluding owner/admins).
async function memberRecipients() {
  return prisma.user.findMany({
    where: { accessLevel: { lt: 3 }, role: { notIn: ['owner', 'admin'] } },
    select: { email: true },
  });
}

const LEVEL_LABEL = { 1: 'Premium', 2: 'Members', 3: 'Free' };

// Single-block notification (admin panel creates/edits a block).
export async function notifyMembersContent({ action, subjectName, chapterTitle, blockTitle, blockCount, accessLevel }) {
  const recipients = await memberRecipients();
  if (!recipients.length) return { sent: 0, total: 0 };
  const verb = action === 'updated' ? 'updated' : 'added';
  const lines = [];
  if (blockTitle) lines.push(`<li><strong>${escapeHtml(blockTitle)}</strong> — ${escapeHtml(LEVEL_LABEL[accessLevel] || `level ${accessLevel}`)}</li>`);
  if (blockCount) lines.push(`<li>+${blockCount} new block${blockCount === 1 ? '' : 's'} in this chapter</li>`);
  const body = `<p>New content was ${verb} in <strong>${escapeHtml(subjectName)} / ${escapeHtml(chapterTitle)}</strong>:</p><ul style="margin:8px 0;padding-left:20px">${lines.join('')}</ul><p>Log in to read it now.</p>`;
  let sent = 0;
  for (const u of recipients) {
    if (await sendMail(u.email, `New content: ${subjectName} — ${chapterTitle}`, `New content in ${subjectName} — ${chapterTitle}`, body)) sent += 1;
  }
  return { sent, total: recipients.length };
}

// Digest notification after a content import (deploys) — only for chapters
// whose block count actually changed.
export async function notifyMembersImport({ changed, totalBlocks }) {
  if (!changed.length) return { sent: 0, total: 0 };
  const recipients = await memberRecipients();
  if (!recipients.length) return { sent: 0, total: 0 };
  const items = changed
    .map((c) => `<li><strong>${escapeHtml(c.subject)} / ${escapeHtml(c.chapter)}</strong> — ${c.before} → ${c.after} blocks</li>`)
    .join('');
  const body = `<p>The library was refreshed with <strong>${totalBlocks}</strong> blocks across ${changed.length} changed chapter${changed.length === 1 ? '' : 's'}:</p><ul style="margin:8px 0;padding-left:20px">${items}</ul><p>Log in to read the new notes.</p>`;
  let sent = 0;
  for (const u of recipients) {
    if (await sendMail(u.email, `Library updated: ${changed.length} chapter${changed.length === 1 ? '' : 's'}`, 'The study library was updated', body)) sent += 1;
  }
  return { sent, total: recipients.length };
}
