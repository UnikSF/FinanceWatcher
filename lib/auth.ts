import crypto from "crypto";
import { getDb } from "./db";

const INVITE_DAYS = 7;

// No app-level accounts/sessions: access to /finance is gated upstream by the
// homelab reverse-proxy SSO (Odysseus). Only guest invite tokens live here.

export function createInviteToken(label: string): string {
  const db = getDb();
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString();
  db.prepare(
    "INSERT INTO invite_tokens (token, label, expires_at) VALUES (?, ?, ?)"
  ).run(token, label, expiresAt);
  return token;
}

export function validateInviteToken(token: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT expires_at FROM invite_tokens WHERE token = ?")
    .get(token) as { expires_at: string } | undefined;
  if (!row) return false;
  return new Date(row.expires_at) >= new Date();
}

export function listInviteTokens(): Array<{ token: string; label: string; expires_at: string }> {
  return getDb()
    .prepare("SELECT token, label, expires_at FROM invite_tokens ORDER BY created_at DESC")
    .all() as Array<{ token: string; label: string; expires_at: string }>;
}

export function revokeInviteToken(token: string): void {
  getDb().prepare("DELETE FROM invite_tokens WHERE token = ?").run(token);
}
