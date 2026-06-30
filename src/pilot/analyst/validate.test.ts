import { describe, expect, it } from "vitest"

import { validateLedger } from "./validate"
import type { LedgerRecord } from "~/pilot/analyst/types"

// Minimal ledger record helper — only the fields validateLedger reads.
function rec(p: Partial<LedgerRecord>): LedgerRecord {
  return {
    metric: "Net Sales",
    dimension: "Retail",
    grain: "Week",
    value: 100,
    unit: "£k",
    sourcePage: 1,
    confidence: 1,
    ...p,
  } as LedgerRecord
}

/**
 * validateLedger never rewrites a figure — it flags suspicious ones and lowers
 * their confidence, so chat and analysis stay cautious. These assert the three
 * safety checks actually fire, and that clean rows pass through untouched.
 */
describe("validateLedger", () => {
  it("flags a level percentage captured as a fraction (0.42 for 42%)", () => {
    const { flags, ledger } = validateLedger([
      rec({ metric: "Margin %", dimension: "Total", unit: "%", value: 0.42 }),
    ])
    expect(flags.length).toBe(1)
    expect(ledger[0].confidence).toBeLessThanOrEqual(0.5)
  })

  it("flags an implausibly large £k value (likely a scale misread)", () => {
    const { flags } = validateLedger([
      rec({ metric: "Net Sales", grain: "Week", unit: "£k", value: 455_618 }),
    ])
    expect(flags.length).toBe(1)
  })

  it("flags a dimension that is really a value-type", () => {
    const { flags, ledger } = validateLedger([
      rec({ metric: "Net Sales", dimension: "Budget", value: 100 }),
    ])
    expect(flags.length).toBe(1)
    expect(ledger[0].confidence).toBeLessThanOrEqual(0.7)
  })

  it("leaves a clean row untouched (same object reference, no flags)", () => {
    const clean = rec({ metric: "Net Sales", dimension: "Retail", unit: "£k", value: 1200 })
    const { flags, ledger } = validateLedger([clean])
    expect(flags.length).toBe(0)
    expect(ledger[0]).toBe(clean)
  })

  it("does NOT flag a legitimate sub-1 variance (e.g. -0.4 pts movement)", () => {
    const { flags } = validateLedger([
      rec({ metric: "LFL growth", dimension: "Retail", unit: "%", value: -0.4 }),
    ])
    expect(flags.length).toBe(0)
  })
})
