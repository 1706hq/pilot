import { describe, expect, it } from "vitest"

import { AGENTS, CREW } from "./agents"
import { buildSystemPrompt } from "./personas"
import type { AgentId } from "~/pilot/types"

const ALL: AgentId[] = [
  "PILOT",
  "STERLING",
  "MARSHALL",
  "SPARK",
  "SHIELD",
  "SCOUT",
  "PEGASUS",
  "HERCULES",
  "FALCON",
]

/**
 * Guards the CREW roster staying complete and honest as agents are added:
 * every agent has metadata, a distinct accent, and a persona prompt that
 * carries the data-honesty guard (no agent may fake a feed it doesn't have).
 */
describe("CREW roster", () => {
  it("has metadata for every agent", () => {
    for (const id of ALL) {
      expect(AGENTS[id], id).toBeDefined()
      expect(AGENTS[id].name.length).toBeGreaterThan(0)
      expect(AGENTS[id].accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(AGENTS[id].monogram.length).toBeGreaterThan(0)
    }
  })

  it("gives every agent a distinct accent colour", () => {
    const accents = ALL.map((id) => AGENTS[id].accent.toLowerCase())
    expect(new Set(accents).size).toBe(accents.length)
  })

  it("shows the full eight-agent CREW in the roster", () => {
    expect(CREW.length).toBe(8)
    expect(CREW.map((a) => a.id)).not.toContain("PILOT")
  })

  it("builds a persona prompt for every agent, with the company-data guard", () => {
    for (const id of ALL) {
      const p = buildSystemPrompt(id, undefined, undefined, ["American Golf (AGT)"])
      expect(p, id).toContain("PILOT")
      expect(p, id).toContain("verified BLACKBOX data for ONLY")
    }
  })

  it("keeps the CREW honest about unconnected feeds", () => {
    const p = buildSystemPrompt("SPARK")
    expect(p).toContain("NO social media analytics connected")
    expect(buildSystemPrompt("HERCULES")).toContain("NO health devices")
    expect(buildSystemPrompt("FALCON")).toContain("NO broker account connected")
  })
})
