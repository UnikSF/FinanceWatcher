"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
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

export function FlowChart({ data }: { data: MonthlyFlow[] }) {
  if (data.length === 0) {
    return <Empty label="No data yet" />;
  }
  // Net per month + the previous month's net, so the tooltip can show the delta.
  const series: FlowDatum[] = data.map((d, i) => ({
    ...d,
    net: d.income - d.expenses,
    prevNet: i > 0 ? data[i - 1].income - data[i - 1].expenses : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={series} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<FlowTooltip />} cursor={{ fill: "#1e293b", opacity: 0.4 }} />
        <Legend formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>} />
        <Bar dataKey="income" name="Income" fill="#34d399" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#fb7185" radius={[6, 6, 0, 0]} />
        <Line type="monotone" dataKey="net" name="Net" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: "#38bdf8" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  );
}
