import { NextResponse } from "next/server";

// No app-level login: access to /finance is gated upstream by the homelab
// reverse-proxy SSO (Odysseus) — see Ugreen/npm/proxy-host-1.conf. Finance is
// single-dataset behind it, so a second login here is redundant, and the
// container (finance-watcher:3000) is only reachable through that proxy.
export function middleware() {
  return NextResponse.next();
}

export const config = { matcher: [] };
