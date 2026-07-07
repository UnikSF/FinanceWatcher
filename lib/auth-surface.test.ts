import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Non-regression: auth is invite-tokens only. Accounts/sessions were removed
// (SSO at the reverse proxy handles access) — guard against them creeping back.
// Static source checks: importing lib/auth would open the SQLite DB.

const root = path.resolve(__dirname, "..");
const authSrc = readFileSync(path.join(root, "lib", "auth.ts"), "utf8");
const dbSrc = readFileSync(path.join(root, "lib", "db.ts"), "utf8");
const inviteRouteSrc = readFileSync(
  path.join(root, "app", "api", "invite", "create", "route.ts"),
  "utf8"
);

describe("auth surface is invite-tokens only", () => {
  it("lib/auth exports the four invite functions and nothing session-related", () => {
    for (const fn of ["createInviteToken", "validateInviteToken", "listInviteTokens", "revokeInviteToken"]) {
      expect(authSrc).toContain(`export function ${fn}`);
    }
    for (const gone of ["createSession", "hashPassword", "verifyPassword", "isSetupComplete", "fw_session"]) {
      expect(authSrc).not.toContain(gone);
    }
  });

  it("lib/db no longer creates users/sessions tables nor seeds an admin", () => {
    expect(dbSrc).not.toMatch(/CREATE TABLE IF NOT EXISTS (users|sessions)/);
    expect(dbSrc).not.toContain("seedAdmin");
    expect(dbSrc).not.toContain("ADMIN_PASSWORD");
  });

  it("invite management route has no session cookie gate", () => {
    expect(inviteRouteSrc).not.toContain("SESSION_COOKIE_NAME");
    expect(inviteRouteSrc).not.toContain("getSessionUserId");
  });
});
