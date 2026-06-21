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

export function GET(req: NextRequest) {
  const month =
    req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  const recurring = detectRecurring();
  const fixedMonthlyBase = recurring
    .filter((r) => r.interval_days >= 28 && r.interval_days <= 32)
    .reduce((sum, r) => sum + r.avg_amount, 0);

  return NextResponse.json({
    month,
    kpis: monthKpis(month),
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
