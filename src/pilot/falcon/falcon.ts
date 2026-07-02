"use client"

/**
 * FALCON — personal markets. Builds Peter's pre-market / market-wrap brief from
 * LIVE web data over his watchlist: each instrument's level and move, the two or
 * three stories moving markets, and the line that matters for his day. Renders
 * as a FALCON dashboard on the Runway (stat cards + a stories table).
 *
 * Honesty rules: every figure comes from the live web call and is timestamped;
 * a failed fetch returns null (the caller says so) — never a stale or invented
 * level. FALCON has no broker feed: positions exist only if Peter uploads a
 * statement (BLACKBOX reads it like any spreadsheet).
 */

import { openrouterMessage } from "~/pilot/agents/openrouter"
import { getModel } from "~/pilot/storage/config"
import { usePilotStore } from "~/pilot/state/store"
import type { DashboardSpec, StatCardSpec } from "~/pilot/widgets/types"

export interface MarketBriefItem {
  name: string
  /** Pre-formatted level, e.g. "8,214" or "$104,300". */
  level: string
  /** Pre-formatted move, e.g. "+0.4%" or "-1.2%". */
  change: string
  direction: "up" | "down" | "flat"
}

export interface MarketBrief {
  kind: "pre-market" | "market wrap"
  items: MarketBriefItem[]
  stories: { headline: string; why: string }[]
  /** The one line that matters for Peter's day. */
  line: string
}

/** Peter's default watchlist; overridable via config (comma-separated). */
export const DEFAULT_WATCHLIST = [
  "FTSE 100",
  "S&P 500",
  "GBP/USD",
  "Bitcoin",
  "Gold",
  "Brent Crude",
]

export function getWatchlist(): string[] {
  const raw = usePilotStore.getState().config.watchlist
  if (!raw?.trim()) return DEFAULT_WATCHLIST
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return items.length ? items.slice(0, 8) : DEFAULT_WATCHLIST
}

/** Morning = pre-market; afternoon/evening = the wrap. */
export function briefKind(hour = new Date().getHours()): MarketBrief["kind"] {
  return hour < 12 ? "pre-market" : "market wrap"
}

/** Validate/clamp a model-produced brief. Pure, unit-tested. */
export function coerceMarketBrief(raw: unknown, kind: MarketBrief["kind"]): MarketBrief | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const items = (Array.isArray(o.items) ? o.items : [])
    .map((it) => {
      if (!it || typeof it !== "object") return null
      const x = it as Record<string, unknown>
      const name = typeof x.name === "string" ? x.name.trim() : ""
      const level = typeof x.level === "string" ? x.level.trim() : ""
      if (!name || !level) return null
      const dir = x.direction === "up" || x.direction === "down" ? x.direction : "flat"
      return {
        name,
        level,
        change: typeof x.change === "string" ? x.change.trim() : "",
        direction: dir as MarketBriefItem["direction"],
      }
    })
    .filter((x): x is MarketBriefItem => x !== null)
    .slice(0, 8)
  if (items.length === 0) return null
  const stories = (Array.isArray(o.stories) ? o.stories : [])
    .map((s) => {
      if (!s || typeof s !== "object") return null
      const x = s as Record<string, unknown>
      const headline = typeof x.headline === "string" ? x.headline.trim() : ""
      if (!headline) return null
      return { headline, why: typeof x.why === "string" ? x.why.trim() : "" }
    })
    .filter((x): x is { headline: string; why: string } => x !== null)
    .slice(0, 3)
  const line = typeof o.line === "string" ? o.line.trim() : ""
  return { kind, items, stories, line }
}

const BRIEF_PROMPT = (watchlist: string[], kind: string) =>
  `You are FALCON, the markets specialist for Peter Jones CBE (UK investor). Using LIVE web results, build his ${kind} brief.

For each of these instruments give the CURRENT level and today's move: ${watchlist.join(", ")}.
Then the 2-3 stories genuinely moving markets right now, and finally the single line that matters most for a UK investor's day.

Rules: real, current figures from the live results only — if you cannot find an instrument's level, OMIT it rather than guessing. Pre-format numbers ("8,214", "+0.4%"). British English.

Return ONLY JSON:
{"items":[{"name":"FTSE 100","level":"8,214","change":"+0.4%","direction":"up|down|flat"}],"stories":[{"headline":"<what happened>","why":"<why it matters, one line>"}],"line":"<the one line for Peter's day>"}`

/** Fetch + build the brief. Null on any failure — the caller says so plainly. */
export async function generateMarketBrief(): Promise<MarketBrief | null> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return null
  const kind = briefKind()
  try {
    const { content } = await openrouterMessage(
      config.openRouterKey,
      {
        model: getModel(),
        plugins: [{ id: "web", max_results: 8 }],
        messages: [{ role: "user", content: BRIEF_PROMPT(getWatchlist(), kind) }],
        temperature: 0.2,
      },
      { timeoutMs: 60_000, retries: 2 }
    )
    const a = content.indexOf("{")
    const b = content.lastIndexOf("}")
    return coerceMarketBrief(JSON.parse(a >= 0 && b > a ? content.slice(a, b + 1) : content), kind)
  } catch {
    return null
  }
}

function timeLabel(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** Render the brief as a Runway dashboard: stat per instrument + stories table. */
export function briefToDashboard(brief: MarketBrief): DashboardSpec {
  const stats: StatCardSpec[] = brief.items.map((it) => ({
    type: "stat",
    label: it.name,
    value: it.level,
    delta: it.change
      ? { value: it.change, direction: it.direction }
      : undefined,
    accent: it.direction === "up" ? "green" : it.direction === "down" ? "red" : "blue",
  }))
  const children: DashboardSpec["children"] = [...stats]
  if (brief.stories.length) {
    children.push({
      type: "table",
      title: "Moving markets",
      columns: [
        { key: "headline", label: "Story", align: "left" },
        { key: "why", label: "Why it matters", align: "left" },
      ],
      rows: brief.stories.map((s) => ({ headline: s.headline, why: s.why })),
    })
  }
  return {
    type: "dashboard",
    title: `FALCON · ${brief.kind === "pre-market" ? "Pre-market" : "Market wrap"} — as of ${timeLabel()}`,
    children,
  }
}

/** One spoken/written line summarising the brief. */
export function briefLine(brief: MarketBrief): string {
  const top = brief.items
    .slice(0, 3)
    .map((it) => `${it.name} ${it.level}${it.change ? ` (${it.change})` : ""}`)
    .join(", ")
  return `${brief.kind === "pre-market" ? "Pre-market" : "Market wrap"}: ${top}. ${brief.line}`.trim()
}

/**
 * Run the full FALCON brief: fetch, render to the Runway, report. Used by the
 * chat tool and the HUD trigger. Returns the spoken line (or an honest miss).
 */
export async function runMarketBrief(): Promise<string> {
  const store = usePilotStore.getState()
  const taskId = store.addTask({ label: "FALCON · sweeping the markets", agent: "FALCON", status: "working" })
  const brief = await generateMarketBrief()
  if (!brief) {
    usePilotStore.getState().updateTask(taskId, { status: "error", label: "FALCON · markets unavailable" })
    return "I couldn't pull live market data just now — give me another go in a minute."
  }
  usePilotStore.getState().addWidget(briefToDashboard(brief), "FALCON")
  usePilotStore.getState().updateTask(taskId, { status: "done", label: "FALCON · brief on the Runway" })
  return `${briefLine(brief)} The full brief is on the Runway.`
}
