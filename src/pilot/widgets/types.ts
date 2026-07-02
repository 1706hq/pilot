/**
 * Widget specs — the typed JSON the LLM emits (via the render_widget /
 * render_dashboard tools) to build UI on the fly. The model only supplies the
 * inner fields; the orchestrator stamps `id` / `agent` / `createdAt` on arrival.
 *
 * The LLM NEVER emits code. Every spec maps to a vetted React component in
 * WidgetRenderer, so there is no eval / injection surface.
 */

import type { AgentId } from "~/pilot/types"

export type WidgetId = string

export type WidgetAccent = "blue" | "green" | "amber" | "red" | "violet"

export interface WidgetMeta {
  id: WidgetId
  agent: AgentId
  createdAt: number
  /**
   * Provenance — the uploaded file(s) this widget's figures were drawn from,
   * e.g. "American Golf Q1.xlsx". Stamped when the generator grounds the widget
   * in Peter's context, so he can trust (or catch) the numbers. Absent when the
   * widget isn't sourced from an upload.
   */
  source?: string
}

/** A single headline metric. */
export interface StatCardSpec {
  type: "stat"
  title?: string
  /** Pre-formatted by the model, e.g. "$1.2M", "43.5%". */
  value: string
  label: string
  delta?: { value: string; direction: "up" | "down" | "flat" }
  accent?: WidgetAccent
}

export interface ChartSeries {
  name: string
  points: { x: string; y: number }[]
}

export interface ChartSpec {
  type: "chart"
  title?: string
  variant: "line" | "bar"
  series: ChartSeries[]
  yFormat?: "number" | "currency" | "percent"
  accent?: WidgetAccent
}

export interface TableSpec {
  type: "table"
  title?: string
  columns: { key: string; label: string; align?: "left" | "right" }[]
  rows: Record<string, string | number>[]
}

export interface LinkCardSpec {
  type: "link"
  title: string
  url: string
  description?: string
  /** Emoji or short label shown in the avatar slot. */
  favicon?: string
}

export interface FileCardSpec {
  type: "file"
  title?: string
  fileName: string
  mime: string
  /** appData-relative path written by the fs layer. */
  storagePath: string
  sizeBytes?: number
  kind: "invoice" | "report" | "upload" | "other"
}

/** A titled group of child widgets laid out in a grid. No nested dashboards. */
export interface DashboardSpec {
  type: "dashboard"
  title?: string
  children: InnerWidgetSpec[]
}

export interface InvoiceParty {
  /** Company / person name. */
  name: string
  /** Address / email / extra lines, one per line. */
  lines?: string[]
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
}

/** A clean, downloadable invoice rendered as a light "paper" card. */
export interface InvoiceSpec {
  type: "invoice"
  number: string
  issueDate: string
  dueDate?: string
  /** Currency symbol, e.g. "£" (default), "$". */
  currency?: string
  from: InvoiceParty
  to: InvoiceParty
  items: InvoiceLineItem[]
  /** Percent, e.g. 20 for 20% VAT. Omit for none. */
  taxRate?: number
  notes?: string
}

/** A clean prose document / report / brief card (markdown body). */
export interface DocumentSpec {
  type: "document"
  title: string
  subtitle?: string
  /** Markdown: headings (##), **bold**, `*`/`-` bullets, blank lines. */
  body: string
}

/** PEGASUS's pitch-deck screen — the Dragon's verdict card. Built by the
 *  analyst pipeline (never by the LLM widget generator), so its figures come
 *  from the verified extraction. */
export interface PitchSpec {
  type: "pitch"
  company: string
  oneLiner: string
  ask: string
  sector: string
  /** Dragon score 1–5. */
  score: number
  verdict: string
  strengths: string[]
  concerns: string[]
  questions: string[]
}

/** Widgets allowed inside a dashboard (everything except nested dashboards). */
export type InnerWidgetSpec =
  | StatCardSpec
  | ChartSpec
  | TableSpec
  | LinkCardSpec
  | FileCardSpec

/** The raw spec body the model produces (before meta is stamped). */
export type WidgetBody =
  | InnerWidgetSpec
  | DashboardSpec
  | InvoiceSpec
  | DocumentSpec
  | PitchSpec

/** A fully-realised widget held in the store (body + stamped meta). */
export type WidgetSpec = WidgetBody & WidgetMeta

export type WidgetType = WidgetBody["type"]
