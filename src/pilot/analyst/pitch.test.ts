import { describe, expect, it } from "vitest"

import { coercePitchVerdict, looksLikePitch } from "./pitch"
import type { ExtractedPage } from "./types"

function page(title: string, narrative: string[] = []): ExtractedPage {
  return {
    sourcePage: 1,
    pageType: "mixed",
    grain: null,
    pageTitle: title,
    tables: [],
    narrative: narrative.map((text) => ({ text })),
    charts: [],
    unreadable: [],
  }
}

describe("looksLikePitch", () => {
  it("detects by filename", () => {
    expect(looksLikePitch("Acme Pitch Deck v3.pdf", [])).toBe(true)
    expect(looksLikePitch("Series A teaser.pdf", [])).toBe(true)
    expect(looksLikePitch("acme-seed-round.pdf", [])).toBe(true)
  })

  it("detects by content (an ask, a valuation, use of funds)", () => {
    expect(looksLikePitch("acme.pdf", [page("The Ask", ["We are raising £500k"])])).toBe(true)
    expect(looksLikePitch("acme.pdf", [page("Financials", ["£4m pre-money valuation"])])).toBe(true)
    expect(looksLikePitch("acme.pdf", [page("Use of funds")])).toBe(true)
  })

  it("does NOT flag a board pack or KPI tracker as a pitch", () => {
    expect(
      looksLikePitch("FY27 Wk19 AGT Trade Pack.pdf", [
        page("Weekly Trade", ["Retail sales behind budget", "Margin holding at 41%"]),
        page("Category Summary", ["Clubs run-rate risk"]),
      ])
    ).toBe(false)
    expect(looksLikePitch("Sales-KPI Tracker.pdf", [page("KPI Summary")])).toBe(false)
  })
})

describe("coercePitchVerdict", () => {
  it("accepts a full verdict and clamps the score", () => {
    const v = coercePitchVerdict({
      company: "Acme",
      oneLiner: "Robots for gardens",
      ask: "£500k for 10%",
      sector: "Consumer robotics",
      score: 9,
      verdict: "Interesting but pre-revenue — too early.",
      strengths: ["Strong team (p2)"],
      concerns: ["No revenue (p5)", "CAC unstated (p7)"],
      questions: ["What's the CAC?"],
    })!
    expect(v.score).toBe(5) // clamped
    expect(v.company).toBe("Acme")
    expect(v.concerns.length).toBe(2)
  })

  it("rejects a verdict missing the essentials", () => {
    expect(coercePitchVerdict({ score: 3 })).toBeNull()
    expect(coercePitchVerdict({ company: "Acme" })).toBeNull()
    expect(coercePitchVerdict(null)).toBeNull()
  })

  it("defaults a missing ask honestly rather than inventing one", () => {
    const v = coercePitchVerdict({ company: "Acme", verdict: "Pass." })!
    expect(v.ask).toBe("Not stated in the deck")
    expect(v.score).toBe(3)
  })

  it("caps lists at three and drops junk entries", () => {
    const v = coercePitchVerdict({
      company: "Acme",
      verdict: "Pass.",
      strengths: ["a", "b", "c", "d", 42, ""],
    })!
    expect(v.strengths).toEqual(["a", "b", "c"])
  })
})
