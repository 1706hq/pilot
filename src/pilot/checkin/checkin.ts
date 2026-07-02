"use client"

/**
 * The morning CHECK-IN — the ritual at the heart of Peter's PILOT doc: the CREW
 * reports in for duty, then PILOT surfaces "three decisions, maximum".
 *
 * ACCURACY BY CONSTRUCTION: the check-in is assembled deterministically from
 * intelligence that already exists and is already verified — BLACKBOX insights
 * and flags, cached RADAR readings, the brief. No new model call, so it is
 * instant, works offline, and cannot invent a number. The only network touch is
 * FALCON's live market line, which is best-effort and clearly absent when it
 * can't be fetched. Agents without a connected feed report honestly.
 */

import { agentForText, buildBrief } from "~/pilot/brief/brief"
import { getRadar } from "~/pilot/radar/radar"
import { listKnowledgeBases } from "~/pilot/analyst/store"
import { webSearch } from "~/pilot/agents/web"
import type { AgentId } from "~/pilot/types"

export interface CrewReport {
  agent: AgentId
  /** One status line, spoken in the agent's voice. */
  line: string
  /** Items worth attention in this agent's domain (drives the count chip). */
  items: number
  /** Whether this agent has a live data source behind it right now. */
  live: boolean
}

export interface Decision {
  agent: AgentId
  title: string
  detail: string
  /** The exact question Peter taps to open it in chat. */
  prompt: string
}

export interface CheckIn {
  reports: CrewReport[]
  decisions: Decision[]
  /** True when built from analysed data rather than the seeded preview. */
  live: boolean
  companies: string[]
}

/** Yesterday/today key for the once-a-day auto-open guard. */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const LAST_KEY = "pilot.checkin.last"

export function checkinShownToday(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(LAST_KEY) === todayKey()
  } catch {
    return true
  }
}

export function markCheckinShown(): void {
  try {
    window.localStorage.setItem(LAST_KEY, todayKey())
  } catch {
    /* fine */
  }
}

/** Count insights that route to a given agent across every analysed company. */
function domainCounts(): { agent: Record<string, number>; risks: number } {
  const agent: Record<string, number> = {}
  let risks = 0
  for (const kb of listKnowledgeBases()) {
    for (const ins of kb.insights ?? []) {
      const owner = agentForText(`${ins.headline ?? ""} ${ins.detail ?? ""}`)
      agent[owner] = (agent[owner] ?? 0) + 1
      if (ins.kind === "risk") risks += 1
    }
  }
  return { agent, risks }
}

/**
 * Build the full check-in. Pure assembly over existing artefacts — see the
 * header note. Order matches the roster; PILOT itself speaks through the
 * decisions, not a row.
 */
export function buildCheckIn(): CheckIn {
  const kbs = listKnowledgeBases()
  const companies = Array.from(new Set(kbs.map((k) => k.company)))
  const live = kbs.length > 0
  const counts = domainCounts()
  const sterlingItems = counts.agent.STERLING ?? 0
  const marshallItems = counts.agent.MARSHALL ?? 0
  const companiesLabel =
    companies.length === 0
      ? "no companies yet"
      : companies.length === 1
        ? companies[0]
        : `${companies.length} companies`

  const reports: CrewReport[] = [
    {
      agent: "STERLING",
      line: live
        ? `Books read across ${companiesLabel}. ${sterlingItems} financial item${sterlingItems === 1 ? "" : "s"} worth your eye, ${counts.risks} flagged as risk.`
        : "No packs on file yet. Upload one and the numbers are mine.",
      items: sterlingItems,
      live,
    },
    {
      agent: "MARSHALL",
      line: live
        ? `Operations swept. ${marshallItems} item${marshallItems === 1 ? "" : "s"} across KPIs, channels and stores.`
        : "Standing by for the first KPI pack.",
      items: marshallItems,
      live,
    },
    {
      agent: "SPARK",
      line: "Press sweep on request. Brand account feeds aren't connected yet.",
      items: 0,
      live: false,
    },
    {
      agent: "SHIELD",
      line: "No contracts on file. Give me one and I'll track every deadline in it.",
      items: 0,
      live: false,
    },
    {
      agent: "SCOUT",
      line: "Interview briefs ready on request. No hiring pipeline connected yet.",
      items: 0,
      live: false,
    },
    {
      agent: "PEGASUS",
      line: "Pitch queue clear. Drop a deck in and I'll screen it before it costs you an hour.",
      items: 0,
      live: false,
    },
    {
      agent: "HERCULES",
      line: "No health feeds connected. Tell me how you're training and I'll build the plan.",
      items: 0,
      live: false,
    },
    {
      agent: "FALCON",
      line: "Markets on request — say the word and I'll sweep them.",
      items: 0,
      live: false,
    },
  ]

  // Decisions: RADAR turbulence first (crafted, grounded prompts), then urgent
  // brief items, then RADAR signals. Three, maximum — that's the doctrine.
  const decisions: Decision[] = []
  const seen = new Set<string>()
  const push = (d: Decision) => {
    const key = d.title.toLowerCase()
    if (decisions.length < 3 && !seen.has(key)) {
      seen.add(key)
      decisions.push(d)
    }
  }
  const radar = getRadar()
  for (const r of radar.filter((r) => r.kind === "turbulence"))
    push({ agent: agentForText(`${r.headline} ${r.detail}`), title: r.headline, detail: r.detail, prompt: r.prompt })
  const brief = buildBrief()
  if (brief.live)
    for (const b of brief.items.filter((b) => b.urgency !== "watch"))
      push({
        agent: b.agent,
        title: b.title,
        detail: b.detail,
        prompt: `${b.title} — walk me through it and what my decision is.`,
      })
  for (const r of radar.filter((r) => r.kind !== "turbulence"))
    push({ agent: agentForText(`${r.headline} ${r.detail}`), title: r.headline, detail: r.detail, prompt: r.prompt })

  return { reports, decisions, live, companies }
}

/**
 * FALCON's live market line — the one network touch, best-effort with a hard
 * timeout. Returns null when it can't be fetched (the UI simply shows FALCON's
 * on-request line instead; never a stale or invented number).
 */
export async function fetchMarketLine(): Promise<string | null> {
  try {
    const result = await Promise.race([
      webSearch(
        "In ONE sentence for a UK investor this morning: FTSE 100 level and direction, GBP/USD, and the single most market-moving story right now.",
        { spoken: true }
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
    ])
    const text = result?.text?.trim()
    return text ? text.slice(0, 220) : null
  } catch {
    return null
  }
}
