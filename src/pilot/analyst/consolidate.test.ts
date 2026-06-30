import { describe, expect, it } from "vitest"

import { resolveUnit } from "./consolidate"

/**
 * resolveUnit is the guard that stops a count, ratio or per-item £ being
 * silently presented as "£k" (money in thousands) — the class of bug behind
 * Peter's "the numbers are wrong" reports. An explicit unit always wins;
 * otherwise it infers conservatively and leaves genuine unknowns as plain
 * numbers rather than guessing money.
 */
describe("resolveUnit", () => {
  it("trusts an explicit unit over any inference", () => {
    expect(resolveUnit("Transactions", "Retail", "£k")).toBe("£k")
    expect(resolveUnit("Net Sales", "Total", "%")).toBe("%")
  })

  it("classifies percentages / rates / LFL as %", () => {
    expect(resolveUnit("LFL Growth", "Retail", null)).toBe("%")
    expect(resolveUnit("Conversion rate", "Ecom", null)).toBe("%")
    expect(resolveUnit("Margin %", "Total", null)).toBe("%")
  })

  it("classifies explicit thousands as £k", () => {
    expect(resolveUnit("Net Sales £'000", "Total", null)).toBe("£k")
    expect(resolveUnit("Revenue (£k)", "Retail", null)).toBe("£k")
  })

  it("leaves counts as plain numbers, never £k", () => {
    expect(resolveUnit("Transactions", "Retail", null)).toBe(null)
    expect(resolveUnit("Orders", "Ecom", null)).toBe(null)
    expect(resolveUnit("Units", "Total", null)).toBe(null)
  })

  it("leaves per-item money (ATV/ASP/AOV) as plain numbers, not £k", () => {
    expect(resolveUnit("ATV", "Retail", null)).toBe(null)
    expect(resolveUnit("ASP", "Ecom", null)).toBe(null)
  })
})
