import { describe, expect, it } from "vitest"

import { briefKind, briefLine, briefToDashboard, coerceMarketBrief } from "./falcon"

const RAW = {
  items: [
    { name: "FTSE 100", level: "8,214", change: "+0.4%", direction: "up" },
    { name: "Bitcoin", level: "$104,300", change: "-1.2%", direction: "down" },
  ],
  stories: [{ headline: "Oil falls on Doha talks", why: "Eases inflation pressure" }],
  line: "A calm open — nothing needs defending this morning.",
}

describe("coerceMarketBrief", () => {
  it("accepts a well-formed brief", () => {
    const b = coerceMarketBrief(RAW, "pre-market")!
    expect(b.items.length).toBe(2)
    expect(b.items[0].direction).toBe("up")
    expect(b.stories.length).toBe(1)
  })

  it("rejects a brief with no usable instruments (never render an empty board)", () => {
    expect(coerceMarketBrief({ items: [], line: "x" }, "pre-market")).toBeNull()
    expect(coerceMarketBrief({ items: [{ name: "FTSE" }] }, "pre-market")).toBeNull() // no level
    expect(coerceMarketBrief(null, "pre-market")).toBeNull()
  })

  it("drops malformed items and clamps junk directions to flat", () => {
    const b = coerceMarketBrief(
      { items: [...RAW.items, { name: "Gold", level: "$2,400", direction: "sideways" }, "junk"] },
      "market wrap"
    )!
    expect(b.items.length).toBe(3)
    expect(b.items[2].direction).toBe("flat")
  })
})

describe("briefToDashboard", () => {
  it("renders one stat per instrument plus the stories table", () => {
    const spec = briefToDashboard(coerceMarketBrief(RAW, "pre-market")!)
    const stats = spec.children.filter((c) => c.type === "stat")
    const tables = spec.children.filter((c) => c.type === "table")
    expect(stats.length).toBe(2)
    expect(tables.length).toBe(1)
    expect(spec.title).toContain("Pre-market")
  })

  it("colours winners green and losers red", () => {
    const spec = briefToDashboard(coerceMarketBrief(RAW, "pre-market")!)
    const stats = spec.children.filter((c) => c.type === "stat")
    expect(stats[0]).toMatchObject({ accent: "green" })
    expect(stats[1]).toMatchObject({ accent: "red" })
  })
})

describe("briefKind / briefLine", () => {
  it("is pre-market in the morning, the wrap after noon", () => {
    expect(briefKind(7)).toBe("pre-market")
    expect(briefKind(11)).toBe("pre-market")
    expect(briefKind(14)).toBe("market wrap")
  })

  it("summarises the top instruments and the day line", () => {
    const line = briefLine(coerceMarketBrief(RAW, "pre-market")!)
    expect(line).toContain("FTSE 100 8,214")
    expect(line).toContain("calm open")
  })
})
