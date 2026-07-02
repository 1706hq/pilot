/**
 * Agent roster metadata — names, roles, and accent colours used for
 * attribution across the sidebars, transcript and widgets.
 */

import type { AgentId } from "~/pilot/types"

export interface AgentMeta {
  id: AgentId
  /** Display name. */
  name: string
  /** Short role line. */
  role: string
  /** One-line description for the roster. */
  blurb: string
  /** Accent hex used for badges, glows and widget tints. */
  accent: string
  /** Single-letter monogram for the avatar. */
  monogram: string
}

export const AGENTS: Record<AgentId, AgentMeta> = {
  PILOT: {
    id: "PILOT",
    name: "PILOT",
    role: "Orchestrator",
    blurb: "Synthesises the CREW and surfaces only what needs a decision.",
    accent: "#56a1ff",
    monogram: "P",
  },
  STERLING: {
    id: "STERLING",
    name: "STERLING",
    role: "CFO · Finance",
    blurb: "Financial intelligence across the portfolio. Invoices and reports.",
    accent: "#61f2e7",
    monogram: "S",
  },
  MARSHALL: {
    id: "MARSHALL",
    name: "MARSHALL",
    role: "COO · Operations",
    blurb: "Operational intelligence, KPIs and board-pack dashboards.",
    accent: "#d4ff58",
    monogram: "M",
  },
  SPARK: {
    id: "SPARK",
    name: "SPARK",
    role: "CMO · Brand",
    blurb: "Brand and press intelligence. Drafts content for approval.",
    accent: "#ff8f3b",
    monogram: "SP",
  },
  SHIELD: {
    id: "SHIELD",
    name: "SHIELD",
    role: "CLO · Legal",
    blurb: "Contracts, deadlines and compliance. Flags what needs a signature.",
    accent: "#a78bfa",
    monogram: "SH",
  },
  SCOUT: {
    id: "SCOUT",
    name: "SCOUT",
    role: "CPO · People",
    blurb: "Talent intelligence, interview briefs and key-person risk.",
    accent: "#f9a8d4",
    monogram: "SC",
  },
  PEGASUS: {
    id: "PEGASUS",
    name: "PEGASUS",
    role: "CSO · Strategy",
    blurb: "Deal flow, pitch screening and market opportunities.",
    accent: "#7ef29b",
    monogram: "PG",
  },
  HERCULES: {
    id: "HERCULES",
    name: "HERCULES",
    role: "Wellness",
    blurb: "Training, recovery and health. Keeps the operator sharp.",
    accent: "#ff5c7a",
    monogram: "H",
  },
  FALCON: {
    id: "FALCON",
    name: "FALCON",
    role: "Markets",
    blurb: "Live markets, positions and pre-market briefs. The fastest hunter.",
    accent: "#ffd60a",
    monogram: "F",
  },
}

/** The CREW agents that appear in the roster (excludes the PILOT orchestrator). */
export const CREW: AgentMeta[] = [
  AGENTS.STERLING,
  AGENTS.MARSHALL,
  AGENTS.SPARK,
  AGENTS.SHIELD,
  AGENTS.SCOUT,
  AGENTS.PEGASUS,
  AGENTS.HERCULES,
  AGENTS.FALCON,
]

export function agentAccent(agent: AgentId | undefined): string {
  return AGENTS[agent ?? "PILOT"].accent
}
