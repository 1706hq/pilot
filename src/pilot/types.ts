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

/** The lifecycle of an uploaded document being analysed by BLACKBOX. */
export type IngestPhase =
  | "uploading"
  | "reading"
  | "auditing"
  | "analysing"
  | "ready"
  | "error"

/** A live, user-facing record of one upload being processed, for the status UI. */
export interface Ingest {
  id: string
  fileName: string
  company: string
  phase: IngestPhase
  /** Pages/sheets read so far, and the total, for the progress bar + ETA. */
  done: number
  total: number
  /** Grounded figures extracted, set when ready. */
  figures?: number
  error?: string
  startedAt: number
  readyAt?: number
}

/**
 * How a file's contents landed in context — drives the honest "Readable" vs
 * "name only" status PILOT shows so Peter can trust what's actually been read.
 */
export type ContextFileStatus =
  /** Plain-text file read directly. */
  | "text"
  /** Binary (PDF / Word / Excel) whose text we extracted. */
  | "extracted"
  /** Binary we kept by name only — contents not readable. */
  | "binary"

/** Metadata for a user-uploaded context file stored locally. */
export interface ContextFileMeta {
  name: string
  /** localStorage key the file is stored under. */
  path: string
  size: number
  addedAt: number
  /** First chunk of extracted text, for previews / light context. */
  snippet?: string
  /** Whether PILOT can actually read the contents, and how they were obtained. */
  status: ContextFileStatus
  /** True when readable text is available for the model. */
  hasText: boolean
}

/** Runtime configuration, persisted locally on device (localStorage). */
export interface PilotConfig {
  openRouterKey?: string
  elevenLabsKey?: string
  elevenLabsAgentId?: string
  porcupineKey?: string
  /** OpenRouter model id; falls back to the app default when unset. */
  model?: string
}
