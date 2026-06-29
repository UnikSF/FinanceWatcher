"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Where can I cut spending this month?",
  "How much do I spend on subscriptions?",
  "Am I on track for my goals?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    text = text.trim();
    if (!text || busy) return;
    setError("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/finance/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Chat failed.");
      else setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Ask AI</h1>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        {messages.length === 0 && (
          <div className="space-y-3 text-sm text-slate-500">
            <p>Ask anything about your finances — it sees your recent transactions, budgets and goals.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-600 hover:text-emerald-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-emerald-600/20 text-emerald-100"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && <div className="text-sm text-slate-500">Claude is thinking…</div>}
        <div ref={endRef} />
      </div>

      {error && <div className="mt-2 text-sm text-rose-400">{error}</div>}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-600"
          placeholder="Ask about your finances…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
