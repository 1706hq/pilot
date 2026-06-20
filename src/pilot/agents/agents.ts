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
}

/** The CREW agents that appear in the roster (excludes the PILOT orchestrator). */
export const CREW: AgentMeta[] = [AGENTS.STERLING, AGENTS.MARSHALL]

export function agentAccent(agent: AgentId | undefined): string {
  return AGENTS[agent ?? "PILOT"].accent
}
