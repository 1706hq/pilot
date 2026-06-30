/**
 * Pure value formatting for chart axes and labels. Kept out of the chart
 * component (which imports motion/react) so it can be unit-tested under Node.
 */

export type YFormat = "number" | "currency" | "percent" | undefined

/** Compact, human-readable axis/value label (e.g. £1.2m, 340k, 12%, -£40k). */
export function fmtY(v: number, f: YFormat): string {
  if (f === "percent") return `${Math.round(v * 10) / 10}%`
  const sign = v < 0 ? "-" : ""
  const a = Math.abs(v)
  let body: string
  if (a >= 1_000_000) body = `${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}m`
  else if (a >= 1_000) body = `${(a / 1_000).toFixed(a >= 10_000 ? 0 : 1)}k`
  else body = `${Math.round(a * 10) / 10}`
  return `${sign}${f === "currency" ? "£" : ""}${body}`
}
