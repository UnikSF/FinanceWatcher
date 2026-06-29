import ExcelJS from "exceljs";
import { getDb } from "./db";
import {
  budgetProgress,
  monthKpis,
  monthlyFlows,
  spendingByCategory,
  topMerchants,
  avgMonthlySavings,
} from "./stats";
import { detectRecurring } from "./recurring";
import { shiftMonth } from "./format";

const EUR = '#,##0.00" €"';
const PCT = "0.0%";
const HEADER_FILL = "FF1F2937"; // slate-800
const HEADER_FONT = "FFE2E8F0"; // slate-200

type TxnRow = {
  date: string;
  account: string;
  merchant: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  source: string;
};

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: HEADER_FONT } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function colFormat(ws: ExcelJS.Worksheet, key: string, numFmt: string) {
  ws.getColumn(key).numFmt = numFmt;
}

/** Build a multi-sheet .xlsx: every transaction detailed + the dashboard's
 *  analyses (KPIs, by-category, 6-month flows, budgets, top merchants,
 *  recurring) for the given month. Returns the file bytes. */
export async function buildWorkbook(month: string): Promise<ArrayBuffer> {
  const db = getDb();
  const wb = new ExcelJS.Workbook();
  wb.creator = "FinanceWatcher";
  wb.created = new Date();

  // ── Résumé (KPIs + month-over-month delta) ────────────────────────────────
  const k = monthKpis(month);
  const prev = monthKpis(shiftMonth(month, -1));
  const recurring = detectRecurring();
  const fixedMonthlyBase = recurring
    .filter((r) => r.interval_days >= 28 && r.interval_days <= 32)
    .reduce((s, r) => s + r.avg_amount, 0);

  const sum = wb.addWorksheet("Résumé");
  sum.columns = [
    { header: "Indicateur", key: "k", width: 30 },
    { header: month, key: "v", width: 16 },
    { header: "Mois précédent", key: "p", width: 16 },
    { header: "Δ", key: "d", width: 16 },
  ];
  const moneyRow = (label: string, cur: number, pre: number) => {
    const r = sum.addRow({ k: label, v: cur, p: pre, d: cur - pre });
    ["v", "p", "d"].forEach((c) => (r.getCell(c).numFmt = EUR));
  };
  moneyRow("Revenus", k.income, prev.income);
  moneyRow("Dépenses", k.expenses, prev.expenses);
  moneyRow("Net (épargne)", k.net, prev.net);
  const fb = sum.addRow({ k: "Base mensuelle fixe (abonnements)", v: fixedMonthlyBase });
  fb.getCell("v").numFmt = EUR;
  const sv = sum.addRow({ k: "Épargne nette moy. (3 mois)", v: avgMonthlySavings() });
  sv.getCell("v").numFmt = EUR;
  sum.addRow({ k: "Transactions ce mois", v: k.txCount });
  sum.addRow({ k: "Non catégorisées", v: k.uncategorized });
  styleHeader(sum);

  // ── Transactions (toutes les dépenses, détaillées) ────────────────────────
  const txns = db
    .prepare(
      `SELECT t.date,
              COALESCE(a.name, '') AS account,
              t.merchant,
              t.description,
              COALESCE(c.name, 'Uncategorized') AS category,
              t.amount,
              CASE WHEN t.amount >= 0 THEN 'Revenu' ELSE 'Dépense' END AS type,
              t.source
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts a ON a.id = t.account_id
       ORDER BY t.date DESC, t.created_at DESC`,
    )
    .all() as TxnRow[];

  const tx = wb.addWorksheet("Transactions");
  tx.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Compte", key: "account", width: 16 },
    { header: "Marchand", key: "merchant", width: 28 },
    { header: "Description", key: "description", width: 40 },
    { header: "Catégorie", key: "category", width: 20 },
    { header: "Montant", key: "amount", width: 14 },
    { header: "Type", key: "type", width: 10 },
    { header: "Source", key: "source", width: 10 },
  ];
  tx.addRows(txns);
  colFormat(tx, "amount", EUR);
  tx.autoFilter = { from: "A1", to: "H1" };
  styleHeader(tx);

  // ── Dépenses par catégorie ────────────────────────────────────────────────
  const cats = spendingByCategory(month);
  const catTotal = cats.reduce((s, c) => s + c.total, 0);
  const cat = wb.addWorksheet("Dépenses par catégorie");
  cat.columns = [
    { header: "Catégorie", key: "name", width: 26 },
    { header: "Total", key: "total", width: 14 },
    { header: "Part", key: "share", width: 10 },
  ];
  cats.forEach((c) =>
    cat.addRow({ name: `${c.icon} ${c.name}`, total: c.total, share: catTotal ? c.total / catTotal : 0 }),
  );
  colFormat(cat, "total", EUR);
  colFormat(cat, "share", PCT);
  styleHeader(cat);

  // ── Revenus vs dépenses (6 mois) ──────────────────────────────────────────
  const flows = monthlyFlows(6);
  const fl = wb.addWorksheet("Revenus vs dépenses");
  fl.columns = [
    { header: "Mois", key: "month", width: 12 },
    { header: "Revenus", key: "income", width: 14 },
    { header: "Dépenses", key: "expenses", width: 14 },
    { header: "Net", key: "net", width: 14 },
  ];
  flows.forEach((f) =>
    fl.addRow({ month: f.month, income: f.income, expenses: f.expenses, net: f.income - f.expenses }),
  );
  ["income", "expenses", "net"].forEach((c) => colFormat(fl, c, EUR));
  styleHeader(fl);

  // ── Budgets ───────────────────────────────────────────────────────────────
  const budgets = budgetProgress(month);
  const bg = wb.addWorksheet("Budgets");
  bg.columns = [
    { header: "Catégorie", key: "name", width: 26 },
    { header: "Budget", key: "budget", width: 14 },
    { header: "Dépensé", key: "spent", width: 14 },
    { header: "Restant", key: "remaining", width: 14 },
    { header: "Utilisé", key: "used", width: 10 },
  ];
  budgets.forEach((b) =>
    bg.addRow({
      name: `${b.icon} ${b.name}`,
      budget: b.budget,
      spent: b.spent,
      remaining: b.budget - b.spent,
      used: b.budget ? b.spent / b.budget : 0,
    }),
  );
  ["budget", "spent", "remaining"].forEach((c) => colFormat(bg, c, EUR));
  colFormat(bg, "used", PCT);
  styleHeader(bg);

  // ── Top marchands ─────────────────────────────────────────────────────────
  const tm = wb.addWorksheet("Top marchands");
  tm.columns = [
    { header: "Marchand", key: "merchant", width: 30 },
    { header: "Total", key: "total", width: 14 },
    { header: "Opérations", key: "count", width: 12 },
  ];
  tm.addRows(topMerchants(month, 20));
  colFormat(tm, "total", EUR);
  styleHeader(tm);

  // ── Dépenses récurrentes ──────────────────────────────────────────────────
  const rc = wb.addWorksheet("Récurrents");
  rc.columns = [
    { header: "Marchand", key: "merchant", width: 30 },
    { header: "Catégorie", key: "category", width: 20 },
    { header: "Montant moyen", key: "avg", width: 14 },
    { header: "Occurrences", key: "occ", width: 12 },
    { header: "Intervalle (j)", key: "interval", width: 14 },
    { header: "Dernier", key: "last", width: 12 },
    { header: "Prochain", key: "next", width: 12 },
  ];
  recurring.forEach((r) =>
    rc.addRow({
      merchant: r.merchant,
      category: r.category_name ?? "—",
      avg: r.avg_amount,
      occ: r.occurrences,
      interval: r.interval_days,
      last: r.last_date,
      next: r.next_date,
    }),
  );
  colFormat(rc, "avg", EUR);
  styleHeader(rc);

  // exceljs returns a Node Buffer at runtime (a valid BodyInit); typed as
  // ArrayBuffer so the route's Response() accepts it under strict DOM types.
  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}
