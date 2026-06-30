import { describe, expect, it } from "vitest"

import { isActual, isBudget, isLflPct, isVsBud, isVsBudPct, isVsLY } from "./columns"

/**
 * These guard the exact column misreads the old substring matcher caused:
 * month names read as year-on-year, and a bare "Budget %" read as a variance.
 */
describe("column classification", () => {
  it("does NOT read month/period names as year-on-year (the 'ly' substring bug)", () => {
    expect(isVsLY("july act")).toBe(false)
    expect(isVsLY("monthly")).toBe(false)
    expect(isVsLY("yearly")).toBe(false)
    expect(isVsLY("only")).toBe(false)
  })

  it("DOES read genuine last-year columns", () => {
    expect(isVsLY("vs ly")).toBe(true)
    expect(isVsLY("ly")).toBe(true)
    expect(isVsLY("yoy")).toBe(true)
    expect(isVsLY("last year")).toBe(true)
    expect(isVsLY("ly %")).toBe(false) // a % column is not the value column
  })

  it("does NOT treat a bare 'Budget %' as a variance", () => {
    expect(isVsBudPct("budget %")).toBe(false)
    expect(isVsBudPct("bud %")).toBe(false)
    // a real variance % needs an explicit marker
    expect(isVsBudPct("vs bud %")).toBe(true)
    expect(isVsBudPct("var to budget %")).toBe(true)
  })

  it("separates budget LEVEL from budget VARIANCE", () => {
    expect(isBudget("budget")).toBe(true)
    expect(isBudget("bud")).toBe(true)
    expect(isBudget("vs bud")).toBe(false) // variance, not a level
    expect(isBudget("budget %")).toBe(false) // a percentage, not a level value
    expect(isVsBud("vs bud")).toBe(true)
    expect(isVsBud("vs bud %")).toBe(false) // that's the % variance
  })

  it("matches actual without matching words that merely contain 'act'", () => {
    expect(isActual("act")).toBe(true)
    expect(isActual("actual")).toBe(true)
    expect(isActual("outturn")).toBe(true)
    expect(isActual("contract value")).toBe(false)
  })

  it("matches like-for-like %", () => {
    expect(isLflPct("lfl %")).toBe(true)
    expect(isLflPct("like-for-like %")).toBe(true)
    expect(isLflPct("lfl")).toBe(false) // value, not %
  })
})
