/**
 * Core PILOT domain types, shared across state, agents, tools and UI.
 */

/** Visual/interaction state that drives the Orb + BorderGlow. */
export type PilotState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking"

/** The orchestrator plus the two v1 CREW agents. Agents are personas, not processes. */
export type AgentId = "PILOT" | "STERLING" | "MARSHALL"

export type ChatRole = "user" | "assistant" | "system" | "tool"

export interface ChatMessage {
  id: string
  role: ChatRole
  /** Which persona produced/owns this message (for attribution + colouring). */
  agent?: AgentId
  content: string
  /** True while tokens are still streaming into `content`. */
  streaming?: boolean
}

export type TaskStatus = "working" | "done" | "error"

/** A visible sub-agent task shown in the left sidebar. */
export interface Task {
  id: string
  label: string
  agent: AgentId
  status: TaskStatus
  detail?: string
  startedAt: number
}

/** Metadata for a user-uploaded context file stored locally. */
export interface ContextFileMeta {
  name: string
  /** appData-relative path on disk. */
  path: string
  size: number
  addedAt: number
  /** First chunk of extracted text, for previews / light context. */
  snippet?: string
}

/** Runtime configuration, persisted locally on device. */
export interface PilotConfig {
  openRouterKey?: string
  elevenLabsKey?: string
  elevenLabsAgentId?: string
  porcupineKey?: string
}
