import { NextRequest } from "next/server";
import { buildWorkbook } from "@/lib/excel";

// Detailed Excel export: every transaction + the dashboard's analyses for the
// given month. Node runtime (better-sqlite3 + exceljs).
export async function GET(req: NextRequest) {
  const month =
    req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const buf = await buildWorkbook(month);
  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="financewatcher-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
