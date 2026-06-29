"use client";

import { useRef } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtEur } from "@/lib/format";
import { deltaInfo } from "@/lib/delta";
import type { CategorySpend, MonthlyFlow } from "@/lib/stats";

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "0.75rem",
  color: "#e2e8f0",
};

// Compact value for on-chart labels: 1234 -> "1.2k", keeps bars uncluttered
// while the tooltip still shows the exact euro amount.
function kfmt(v: number): string {
  const n = Math.round(v);
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return (Math.abs(k) >= 10 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, "")) + "k";
  }
  return String(n);
}

export function CategoryDonut({ data }: { data: CategorySpend[] }) {
  if (data.length === 0) {
    return <Empty label="No expenses this month yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          innerRadius={70}
          outerRadius={105}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => fmtEur(Number(value))}
        />
        <Legend
          formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

type FlowDatum = MonthlyFlow & { net: number; prevNet: number | null };

/** Tooltip showing the month's income/expenses/net plus the net delta vs the
 *  previous month (signed, %, colored by whether the move is favorable). */
function FlowTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: FlowDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows: Array<[string, number, string]> = [
    ["Income", d.income, "#34d399"],
    ["Expenses", d.expenses, "#fb7185"],
    ["Net", d.net, d.net >= 0 ? "#38bdf8" : "#fb7185"],
  ];
  let delta = null;
  if (d.prevNet !== null) {
    const info = deltaInfo(d.net, d.prevNet, true);
    const color = info.flat ? "#94a3b8" : info.good ? "#34d399" : "#fb7185";
    delta = (
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #334155", color, fontSize: 12 }}>
        {info.flat ? "→" : info.up ? "▲" : "▼"} {fmtEur(Math.abs(info.delta))}
        {info.pct !== null && ` (${info.pct >= 0 ? "+" : "−"}${Math.abs(info.pct).toFixed(0)}%)`}
        <span style={{ color: "#64748b" }}> vs mois préc.</span>
      </div>
    );
  }
  return (
    <div style={{ ...tooltipStyle, padding: "8px 12px" }}>
      <div style={{ marginBottom: 4, fontWeight: 600 }}>{d.month}</div>
      {rows.map(([label, value, color]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 20, fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>{label}</span>
          <span style={{ color }}>{fmtEur(value)}</span>
        </div>
      ))}
      {delta}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FlowChart({ data }: { data: MonthlyFlow[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) {
    return <Empty label="No data yet" />;
  }
  // Net per month + the previous month's net, so the tooltip can show the delta.
  const series: FlowDatum[] = data.map((d, i) => ({
    ...d,
    net: d.income - d.expenses,
    prevNet: i > 0 ? data[i - 1].income - data[i - 1].expenses : null,
  }));

  function exportCsv() {
    const header = "Month,Income,Expenses,Net";
    // Quote the month (the only free-text column) so a comma can't shift columns.
    const lines = series.map((d) => `"${d.month.replace(/"/g, '""')}",${d.income},${d.expenses},${d.net}`);
    triggerDownload(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" }),
      "income-vs-expenses.csv",
    );
  }

  // Rasterize the chart's SVG to a PNG (no external resources → canvas stays
  // untainted, so toBlob works). Fills the card background first.
  function exportPng() {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(rect.width));
    clone.setAttribute("height", String(rect.height));
    const xml = new XMLSerializer().serializeToString(clone);
    const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#1a1d27";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => b && triggerDownload(b, "income-vs-expenses.png"), "image/png");
    };
    img.src = src;
  }

  return (
    <div ref={wrapRef}>
      <div className="mb-2 flex justify-end gap-2">
        <button
          onClick={exportCsv}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          ⬇ CSV
        </button>
        <button
          onClick={exportPng}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          ⬇ PNG
        </button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={series} barGap={4} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<FlowTooltip />} cursor={{ fill: "#1e293b", opacity: 0.4 }} />
          <Legend formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>} />
          <Bar dataKey="income" name="Income" fill="#34d399" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="income" position="top" formatter={(v: unknown) => kfmt(Number(v))} fill="#34d399" fontSize={10} />
          </Bar>
          <Bar dataKey="expenses" name="Expenses" fill="#fb7185" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="expenses" position="top" formatter={(v: unknown) => kfmt(Number(v))} fill="#fb7185" fontSize={10} />
          </Bar>
          <Line type="monotone" dataKey="net" name="Net" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: "#38bdf8" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  );
}
