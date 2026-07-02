/**
 * "Today's Brief" — the morning summary of what needs Peter's decision, shown
 * on the idle home (he scrolls to it under the orb). PILOT's job is to surface
 * decisions, not data, so these are decision PROMPTS, not dashboards.
 *
 * IMPORTANT: this is SEEDED, illustrative content — a preview of the surface,
 * not live signals. It deliberately avoids asserting precise financial figures
 * (Peter's #1 complaint was wrong numbers), so nothing here can be "wrong". Wire
 * it to real signals (calendar, the CREW's findings, uploaded data) before
 * treating any item as fact. The UI flags it "Preview" so that's honest.
 */

import { listKnowledgeBases } from "~/pilot/analyst/store"
import type { AgentId } from "~/pilot/types"

export type BriefUrgency = "now" | "today" | "watch"

export interface BriefItem {
  id: string
  /** Which CREW member owns / raised it (drives the accent). */
  agent: AgentId
  title: string
  detail: string
  /** Short timing chip, e.g. "10:00", "By Fri". Optional. */
  when?: string
  urgency: BriefUrgency
}

/** Seeded sample brief — grounded in Peter's real portfolio, no hard figures. */
export const TODAYS_BRIEF: BriefItem[] = [
  {
    id: "brief-ag-board",
    agent: "MARSHALL",
    title: "American Golf board",
    detail:
      "Board sits at 10:00. The pack's ready — footfall and margin are the two threads worth pulling.",
    when: "10:00",
    urgency: "now",
  },
  {
    id: "brief-jessops",
    agent: "STERLING",
    title: "Jessops — your call needed",
    detail:
      "The store-footprint decision can't slip past Friday. I've laid out the options; you choose.",
    when: "By Fri",
    urgency: "today",
  },
  {
    id: "brief-interviews",
    agent: "PILOT",
    title: "Two interviews lined up",
    detail:
      "Candidates for the American Golf MD seat. Briefs are ready whenever you want them.",
    urgency: "today",
  },
  {
    id: "brief-cash",
    agent: "STERLING",
    title: "Portfolio cash — comfortable",
    detail:
      "Nothing across the group needs you today. I'll flag the moment that changes.",
    urgency: "watch",
  },
]

const URGENCY_BY_KIND: Record<string, BriefUrgency> = {
  risk: "now",
  opportunity: "today",
  movement: "watch",
}
const KIND_RANK: Record<string, number> = { risk: 0, opportunity: 1, movement: 2 }

/** Route an insight to the CREW member whose domain it sits in. */
export function agentForText(text: string): AgentId {
  const t = text.toLowerCase()
  if (/margin|cash|p&l|profit|budget|revenue|sales|invoice|ebitda|forecast|£|risk/.test(t))
    return "STERLING"
  if (/footfall|stock|store|delivery|kpi|supply|operation|trustpilot|customer|web|ecom|transaction|fulfil/.test(t))
    return "MARSHALL"
  return "PILOT"
}

/**
 * Build the brief from what BLACKBOX has actually found — the highest-signal
 * insights across every analysed document, risks first, each carrying its source
 * pages. Falls back to the seeded preview only when nothing's been analysed yet.
 */
export function buildBrief(): { items: BriefItem[]; live: boolean } {
  const kbs = listKnowledgeBases()
  const ranked: { item: BriefItem; rank: number }[] = []
  kbs.forEach((kb) => {
    ;(kb.insights ?? []).forEach((ins, i) => {
      const headline = (ins.headline ?? "").trim()
      const rawDetail = (ins.detail ?? "").trim()
      if (!headline && !rawDetail) return
      const cite = ins.citations?.length ? ` (p${ins.citations.join(", p")})` : ""
      const detail =
        rawDetail.length > 168 ? rawDetail.slice(0, 165) + "…" : rawDetail
      ranked.push({
        item: {
          id: `${kb.docId}-${i}`,
          agent: agentForText(`${headline} ${rawDetail}`),
          title: headline || rawDetail.slice(0, 60),
          detail: (detail || headline) + cite,
          when: ins.kind === "risk" ? "Flagged" : undefined,
          urgency: URGENCY_BY_KIND[ins.kind] ?? "watch",
        },
        rank: (KIND_RANK[ins.kind] ?? 3) * 100 + i,
      })
    })
  })
  if (ranked.length === 0) return { items: TODAYS_BRIEF, live: false }
  ranked.sort((a, b) => a.rank - b.rank)
  return { items: ranked.slice(0, 5).map((r) => r.item), live: true }
}
