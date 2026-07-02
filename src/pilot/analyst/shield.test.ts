import { describe, expect, it } from "vitest"

import { coerceContractReview, dateUrgency, looksLikeContract } from "./shield"
import type { ExtractedPage } from "./types"

function page(title: string, narrative: string[] = []): ExtractedPage {
  return {
    sourcePage: 1,
    pageType: "narrative",
    grain: null,
    pageTitle: title,
    tables: [],
    narrative: narrative.map((text) => ({ text })),
    charts: [],
    unreadable: [],
  }
}

describe("looksLikeContract", () => {
  it("detects by filename", () => {
    expect(looksLikeContract("Shareholders Agreement 2026.pdf", [])).toBe(true)
    expect(looksLikeContract("unit4-lease-final.docx", [])).toBe(true)
    expect(looksLikeContract("NDA - Acme.pdf", [])).toBe(true)
  })

  it("detects by content (contract boilerplate)", () => {
    expect(looksLikeContract("doc1.pdf", [page("Terms", ["This Agreement is made between…"])])).toBe(true)
    expect(looksLikeContract("doc1.pdf", [page("Clause 12", ["governing law of England and Wales"])])).toBe(true)
  })

  it("does NOT flag a board pack or KPI tracker", () => {
    expect(
      looksLikeContract("FY27 Wk19 AGT Trade Pack.pdf", [
        page("Weekly Trade", ["Retail sales behind budget", "Margin holding"]),
      ])
    ).toBe(false)
  })
})

describe("dateUrgency", () => {
  const now = new Date(2026, 6, 2) // 2 Jul 2026

  it("classifies past / soon / later deterministically", () => {
    expect(dateUrgency("2026-06-30", now)).toBe("past")
    expect(dateUrgency("2026-07-20", now)).toBe("soon") // 18 days out
    expect(dateUrgency("2026-08-30", now)).toBe("soon") // within 60 days
    expect(dateUrgency("2026-12-01", now)).toBe("later")
  })

  it("never guesses at a non-ISO wording", () => {
    expect(dateUrgency("90 days before expiry", now)).toBe("unknown")
    expect(dateUrgency("", now)).toBe("unknown")
  })
})

describe("coerceContractReview", () => {
  it("accepts a full review and caps lists", () => {
    const r = coerceContractReview({
      title: "Lease — Unit 4, Marlow",
      parties: ["PJ Investment Group", "Marlow Estates Ltd"],
      summary: "10-year commercial lease with a year-5 break.",
      dates: [
        { label: "Break clause notice", date: "2026-09-30", note: "6 months required" },
        { label: "Expiry", date: "2031-03-31" },
      ],
      obligations: ["Repairs and insurance on tenant (p4)"],
      risks: ["Upward-only rent review (p6) — worth counsel's eyes"],
    })!
    expect(r.title).toContain("Lease")
    expect(r.dates.length).toBe(2)
    expect(r.dates[0].note).toBe("6 months required")
  })

  it("rejects a review missing the essentials", () => {
    expect(coerceContractReview({ title: "X" })).toBeNull() // no summary
    expect(coerceContractReview(null)).toBeNull()
  })

  it("drops malformed dates rather than inventing them", () => {
    const r = coerceContractReview({
      title: "NDA",
      summary: "Mutual NDA.",
      dates: [{ label: "Expiry" }, { date: "2027-01-01" }, "junk", { label: "Term", date: "2 years" }],
    })!
    expect(r.dates).toEqual([{ label: "Term", date: "2 years", note: undefined }])
  })
})
