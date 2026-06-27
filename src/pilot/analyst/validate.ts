/**
 * BLACKBOX value validation — a final sanity pass over the consolidated ledger
 * that catches the ways financial figures get misrepresented: a percentage
 * captured as a fraction, a value-type mislabelled as a dimension, or a number
 * whose unit/scale looks implausible. It LOWERS CONFIDENCE and records a flag
 * rather than silently rewriting a figure (a wrong "correction" is worse than a
 * flagged number), so the analysis and the chat can be appropriately cautious.
 */

import type { AuditFlag, LedgerRecord } from "~/pilot/analyst/types"

export interface Validation {
  ledger: LedgerRecord[]
  flags: AuditFlag[]
}

/** Row/column labels that are VALUE-TYPES (measures), not real dimensions. */
const VALUE_TYPE_RE =
  /\b(actual|budget|forecast|outturn|variance|var to|vs bud|last year|growth|yoy|budgeted)\b/i

/** Variance / points / movement metrics where a sub-1 value is legitimate. */
const VARIANCE_RE = /\bvar\b|\bvs\b|\bpts?\b|growth|yoy|\blfl\b|movement|\bmvt\b|delta/i

/** Level percentages (a rate/share), where a sub-1 value is likely a fraction. */
const LEVEL_PCT_RE = /margin %|mix %|\brate\b|share|attachment|conversion|penetration/i

/** Forecast / cumulative grains where a large £k total is plausible. */
const CUMULATIVE_RE = /\bfy\b|forecast|outturn|full year|annual|\bytd\b|\bltm\b|year end/i

export function validateLedger(ledger: LedgerRecord[]): Validation {
  const flags: AuditFlag[] = []

  const out = ledger.map((r) => {
    const issues: string[] = []
    let confidence = r.confidence ?? 1
    const label = `${r.metric} ${r.dimension}`.toLowerCase()
    const grainLabel = `${r.grain} ${label}`.toLowerCase()
    const value = r.value

    // 1) A percentage that looks like a fraction (e.g. 0.42 captured for "42%").
    if (
      r.unit === "%" &&
      value !== 0 &&
      Math.abs(value) < 1 &&
      LEVEL_PCT_RE.test(label) &&
      !VARIANCE_RE.test(label)
    ) {
      issues.push("percentage looks like a fraction (e.g. 0.42 for 42%); verify the scale")
      confidence = Math.min(confidence, 0.5)
    }

    // 2) A £k figure implausibly large for what it measures — likely a misread
    //    value or an actual-£ figure mislabelled as thousands.
    if (
      r.unit === "£k" &&
      Math.abs(value) > (CUMULATIVE_RE.test(grainLabel) ? 1_000_000 : 60_000)
    ) {
      issues.push("£k value unusually large for this figure; verify the scale and value")
      confidence = Math.min(confidence, 0.45)
    }

    // 3) The dimension is actually a value-type — the figure is fine but its
    //    label is muddled, so flag it (the taxonomy, not the number).
    if (VALUE_TYPE_RE.test(r.dimension)) {
      issues.push("dimension is a value-type, not a channel/category; label may be misread")
      confidence = Math.min(confidence, 0.7)
    }

    if (issues.length) {
      flags.push({
        sourcePage: r.sourcePage,
        field: `${r.metric} · ${r.dimension} (${r.grain})`,
        issue: issues.join("; "),
        confidence,
      })
    }
    return confidence === r.confidence ? r : { ...r, confidence }
  })

  return { ledger: out, flags }
}
