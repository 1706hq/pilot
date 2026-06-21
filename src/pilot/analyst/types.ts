/**
 * BLACKBOX — the data-analyst ingestion engine. Turns dense, image-heavy trade
 * packs into a grounded, cited knowledge base that STERLING/MARSHALL read from.
 *
 * Core rule: extraction is fully separated from analysis, and every figure is
 * traceable to a source page. See ./README.md for the architecture + the
 * validation evidence (page 11 of the FY27 Wk19 AGT pack).
 */

/** What a rendered page mostly is — drives how it's transcribed. */
export type PageType = "divider" | "table" | "chart" | "narrative" | "mixed"

export type Unit = "£k" | "%" | null

/** One transcribed cell — exact value, with sign and unit preserved. */
export interface Cell {
  column: string
  /** Number when legible (parentheses already converted to negative); "unreadable" otherwise. */
  value: number | "unreadable"
  unit: Unit
}

export interface ExtractedTable {
  title: string
  columns: string[]
  rows: { label: string; cells: Cell[] }[]
}

/** Stage-1 output for a single page — a faithful transcription, no analysis. */
export interface ExtractedPage {
  sourcePage: number
  pageType: PageType
  /** Period/grain if the page states it: "Last Week" | "MTD" | "N6W" | "FY forecast" | ... */
  grain: string | null
  pageTitle: string
  tables: ExtractedTable[]
  /** Verbatim narrative lines (action logs etc.). */
  narrative: { text: string; owner?: string; due?: string; status?: string }[]
  /** Chart transcription — axes/series/title + any legible points; never invented. */
  charts: { title: string; axes?: string; series?: string[]; points?: string[]; note?: string }[]
  /** Anything the model couldn't read clearly. */
  unreadable: string[]
}

/** Per-field audit verdict from Stage 2. */
export interface AuditFlag {
  sourcePage: number
  field: string
  issue: string
  /** 0–1; low confidence is surfaced, not smoothed over. */
  confidence: number
}

/** The normalized, grounded number — the heart of the knowledge base. */
export interface LedgerRecord {
  metric: string // e.g. "Despatched Sales", "Margin"
  dimension: string // e.g. "Retail", "Ecomm", "Clubs", "Total AGT"
  grain: string // "Last Week" | "MTD" | "N6W" | "FY forecast" | ...
  /** The headline figure for the row — Actual where present. */
  value: number
  unit: Unit
  bud?: number
  vsBud?: number
  vsBudPct?: number
  vsLY?: number
  lflPct?: number
  /** The page section/table the row came from, for disambiguation. */
  table?: string
  sourcePage: number
  confidence: number
}

export interface NarrativeItem {
  text: string
  owner?: string
  due?: string
  status?: string
  sourcePage: number
}

export interface FeedbackItem {
  source: "trustpilot" | "customer-service" | "other"
  theme: string
  quote?: string
  sourcePage: number
}

export interface Entity {
  kind: "store" | "category" | "channel"
  name: string
}

/** A grounded insight from Stage 4 — every claim cites the records it's built on. */
export interface Insight {
  headline: string
  detail: string
  magnitudeGbpK?: number
  kind: "movement" | "risk" | "opportunity"
  /** sourcePages of the LedgerRecords this is built on — no citation, not allowed. */
  citations: number[]
}

export interface QAEntry {
  question: string
  answer: string
  citations: number[]
}

/** The stored, queryable knowledge base for one document. */
export interface KnowledgeBase {
  docId: string
  company: string
  period: string
  ledger: LedgerRecord[]
  narrative: NarrativeItem[]
  feedback: FeedbackItem[]
  entities: Entity[]
  summary?: string
  insights: Insight[]
  qa: QAEntry[]
  /** Pages/fields flagged by the auditor or self-critique — the honesty trail. */
  flags: AuditFlag[]
  builtAt: number
}
