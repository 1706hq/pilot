/**
 * BLACKBOX column classification — the SINGLE source of truth for "which column
 * is this?", shared by consolidate (what gets stored) and verify (what gets
 * reconciled) so they can never disagree about a cell.
 *
 * Matching is word-boundary aware on purpose. The old substring matcher caused
 * real misreads:
 *  - "ly" matched "July", "Monthly", "Yearly", "Only" → a month column read as a
 *    year-on-year figure.
 *  - "act" matched "contract"/"fact"; a bare "Budget %" (an absolute budgeted
 *    percentage) was read as "% vs budget", i.e. a variance that wasn't there.
 * Here a % variance column MUST carry an explicit variance marker (vs/var/Δ…),
 * so a plain "Budget %" is left alone rather than presented as a variance.
 */

import type { Cell } from "~/pilot/analyst/types"

const VARIANCE = /\b(vs|var|variance|delta|chg|change|mvt|movement)\b|Δ/
const PCT = /%|\bpct\b/
const BUD = /\bbud(get|geted)?\b/

/** Actual / outturn (the headline value). Word-bounded so "contract" ≠ actual. */
export const isActual = (k: string): boolean => /\b(act|actual|actuals|outturn|current)\b/.test(k)

/** Budget LEVEL (absolute) — not a variance, not a percentage. */
export const isBudget = (k: string): boolean => BUD.test(k) && !VARIANCE.test(k) && !PCT.test(k)

/** Variance to budget in value (£) terms. */
export const isVsBud = (k: string): boolean => BUD.test(k) && VARIANCE.test(k) && !PCT.test(k)

/** Variance to budget in % terms — REQUIRES a variance marker (so a bare
 *  "Budget %" is NOT mistaken for "% vs budget"). */
export const isVsBudPct = (k: string): boolean => BUD.test(k) && VARIANCE.test(k) && PCT.test(k)

/** Year-on-year (value terms). "\bly\b" matches "LY"/"vs LY" but not July/Monthly. */
export const isVsLY = (k: string): boolean =>
  (/\bly\b/.test(k) || /\blast year\b|\byoy\b|year[\s-]?on[\s-]?year/.test(k)) && !PCT.test(k)

/** Like-for-like in % terms. */
export const isLflPct = (k: string): boolean =>
  (/\blfl\b/.test(k) || /like[\s-]?for[\s-]?like/.test(k)) && PCT.test(k)

/** First cell whose lower-cased column header satisfies `pred`. */
export function findCol(cells: Cell[], pred: (k: string) => boolean): Cell | undefined {
  return cells.find((c) => pred(c.column.toLowerCase()))
}
