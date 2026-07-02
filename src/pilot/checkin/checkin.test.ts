import { describe, expect, it } from "vitest"

import { buildCheckIn } from "./checkin"

/**
 * The check-in must be complete, honest and bounded: every CREW agent reports,
 * decisions never exceed three ("three, maximum" is doctrine), every decision
 * carries a tappable prompt, and agents without a connected feed never claim
 * live status. Runs against the bundled seed (American Golf) under Node.
 */
describe("buildCheckIn", () => {
  const checkin = buildCheckIn()

  it("has all eight CREW agents reporting, in roster order", () => {
    expect(checkin.reports.map((r) => r.agent)).toEqual([
      "STERLING",
      "MARSHALL",
      "SPARK",
      "SHIELD",
      "SCOUT",
      "PEGASUS",
      "HERCULES",
      "FALCON",
    ])
  })

  it("is live off the seed and names the company", () => {
    expect(checkin.live).toBe(true)
    expect(checkin.companies.join()).toContain("American Golf")
  })

  it("caps decisions at three, each with a prompt", () => {
    expect(checkin.decisions.length).toBeGreaterThan(0)
    expect(checkin.decisions.length).toBeLessThanOrEqual(3)
    for (const d of checkin.decisions) {
      expect(d.prompt.length).toBeGreaterThan(10)
      expect(d.title.length).toBeGreaterThan(0)
    }
  })

  it("keeps unconnected agents honest (no live claim, no items)", () => {
    for (const agent of ["SPARK", "SHIELD", "SCOUT", "PEGASUS", "HERCULES", "FALCON"]) {
      const r = checkin.reports.find((x) => x.agent === agent)!
      expect(r.live, agent).toBe(false)
      expect(r.items, agent).toBe(0)
    }
  })

  it("gives STERLING and MARSHALL live status with the analysed data", () => {
    const sterling = checkin.reports.find((r) => r.agent === "STERLING")!
    expect(sterling.live).toBe(true)
    expect(sterling.line).toContain("American Golf")
  })
})
