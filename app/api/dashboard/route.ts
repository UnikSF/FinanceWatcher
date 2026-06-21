import { NextRequest, NextResponse } from "next/server";
import {
  budgetProgress,
  cumulativeNet,
  monthKpis,
  monthlyFlows,
  spendingByCategory,
  spendingByTopCategory,
  topMerchants,
  unplanned,
} from "@/lib/stats";
import { detectRecurring } from "@/lib/recurring";
import { shiftMonth } from "@/lib/format";

export function GET(req: NextRequest) {
  const month =
    req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  const recurring = detectRecurring();
  const fixedMonthlyBase = recurring
    .filter((r) => r.interval_days >= 28 && r.interval_days <= 32)
    .reduce((sum, r) => sum + r.avg_amount, 0);

  const kpis = monthKpis(month);
  const p = monthKpis(shiftMonth(month, -1));

  return NextResponse.json({
    month,
    kpis: {
      ...kpis,
      prev: { income: p.income, expenses: p.expenses, net: p.net },
      cumulativeNet: cumulativeNet(month),
    },
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
