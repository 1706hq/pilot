import { describe, expect, it } from "vitest"

import { retrieveContext, analysedCompanies } from "./store"

/**
 * Guards the exact regression that shipped to Peter in v0.4.0: company scoping
 * compared the canonical name "american golf" to the stored company field
 * "American Golf (AGT)" by exact match, so a question naming a company we DO
 * hold was filtered to empty and PILOT claimed it had no data. These run against
 * the bundled seed (American Golf), which is present even under Node.
 */
describe("retrieveContext company scoping", () => {
  it("returns data when Peter names a company we DO hold (the v0.4.0 regression)", () => {
    const out = retrieveContext("how is American Golf performing this week?")
    expect(out.length).toBeGreaterThan(0)
  })

  it("matches the AGT shorthand too", () => {
    expect(retrieveContext("show me the AGT trade pack numbers").length).toBeGreaterThan(0)
  })

  it("returns nothing for a portfolio company we have NO data for (refusal preserved)", () => {
    // Jessops is a known portfolio company but not in the seed — PILOT must say
    // it doesn't have it rather than borrow American Golf's figures.
    expect(retrieveContext("how is Jessops doing?")).toBe("")
  })

  it("returns data for a general query that names no company", () => {
    expect(retrieveContext("give me a portfolio summary").length).toBeGreaterThan(0)
  })

  it("surfaces the year-on-year (vsLY) deltas that were being dropped", () => {
    // ~600 seed rows carry vsLY; fmt() must include it so 'vs last year'
    // questions aren't answered blind.
    const out = retrieveContext("American Golf sales vs last year")
    expect(out).toContain("vsLY")
  })
})

describe("analysedCompanies", () => {
  it("lists American Golf from the seed (so the system prompt never says 'no data')", () => {
    const companies = analysedCompanies()
    expect(companies.length).toBeGreaterThan(0)
    expect(companies.some((c) => c.toLowerCase().includes("american golf"))).toBe(true)
  })
})
