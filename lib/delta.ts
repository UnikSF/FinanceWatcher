/** Month-over-month change for a KPI, with sign, % and whether the move is
 *  favorable for that metric (income/net: up is good; expenses: down is good). */
export type DeltaInfo = {
  delta: number;
  pct: number | null; // null when there's no previous value to compare against
  up: boolean;
  flat: boolean;
  good: boolean;
};

export function deltaInfo(current: number, prev: number, goodUp: boolean): DeltaInfo {
  const delta = current - prev;
  const flat = Math.round(delta) === 0;
  const up = delta > 0;
  const good = flat ? true : up === goodUp;
  const pct = prev ? (delta / Math.abs(prev)) * 100 : null;
  return { delta, pct, up, flat, good };
}
