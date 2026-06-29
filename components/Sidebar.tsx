"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";

// Responsive app shell: a static sidebar on desktop, a slide-in drawer behind a
// hamburger on mobile (<md). The drawer closes whenever the route changes.
export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="text-xl leading-none">
          ☰
        </button>
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="text-2xl">💸</span> FinanceWatcher
        </span>
      </header>

      {/* Drawer backdrop (mobile only) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile, always-on on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-800 bg-slate-950 px-4 py-6 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
          <span className="text-2xl">💸</span> FinanceWatcher
        </div>
        <Nav />
        <div className="mt-auto px-2 text-xs text-slate-600">Local data · EUR</div>
      </aside>
    </>
  );
}
