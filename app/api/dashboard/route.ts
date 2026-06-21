import { NextRequest, NextResponse } from "next/server";
import {
  budgetProgress,
  monthKpis,
  monthlyFlows,
  spendingByCategory,
  spendingByTopCategory,
  topMerchants,
  unplanned,
} from "@/lib/stats";
import { detectRecurring } from "@/lib/recurring";

/** Previous YYYY-MM for month-over-month deltas. */
function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export function GET(req: NextRequest) {
  const month =
    req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  const recurring = detectRecurring();
  const fixedMonthlyBase = recurring
    .filter((r) => r.interval_days >= 28 && r.interval_days <= 32)
    .reduce((sum, r) => sum + r.avg_amount, 0);

  const kpis = monthKpis(month);
  const p = monthKpis(prevMonth(month));

  return NextResponse.json({
    month,
    kpis: { ...kpis, prev: { income: p.income, expenses: p.expenses, net: p.net } },
    byCategory: spendingByCategory(month),
    flows: monthlyFlows(6),
    budgets: budgetProgress(month),
    topMerchants: topMerchants(month),
    groups: spendingByTopCategory(month),
    unplanned: unplanned(month),
    recurring: recurring.slice(0, 8),
    fixedMonthlyBase,
  });
}
