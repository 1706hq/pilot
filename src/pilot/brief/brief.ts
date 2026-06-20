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
