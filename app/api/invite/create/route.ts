import { NextRequest, NextResponse } from "next/server";
import { createInviteToken, listInviteTokens, revokeInviteToken } from "@/lib/auth";

// No session gate: this route is only reachable through the homelab
// reverse-proxy SSO, same as the settings page that calls it.

export async function GET() {
  return NextResponse.json(listInviteTokens());
}

export async function POST(req: NextRequest) {
  const { label } = (await req.json()) as { label?: string };
  const inviteToken = createInviteToken(label ?? "");
  const url = `${req.nextUrl.origin}/invite/${inviteToken}`;
  return NextResponse.json({ token: inviteToken, url });
}

export async function DELETE(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  revokeInviteToken(token);
  return NextResponse.json({ ok: true });
}
