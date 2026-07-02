"use client"

/**
 * SHIELD — legal & compliance. When Peter uploads a contract it rides the same
 * verified pipeline as everything else, then SHIELD reviews the extracted text:
 * who the parties are, what the key dates are (renewal, notice, expiry,
 * payment), the obligations that bind Peter's side, and anything unusual or
 * onerous. Dates get a deterministic urgency (past / soon / later) computed
 * HERE, not by the model, so "needs your signature by Friday" can never drift.
 *
 * SHIELD is not a law firm: it flags with citations and recommends counsel for
 * anything that needs formal advice. A clause it hasn't read is never guessed.
 */

import { openrouterContent } from "~/pilot/agents/openrouter"
import type { ExtractedPage } from "~/pilot/analyst/types"
import { getModel } from "~/pilot/storage/config"

export interface ContractDate {
  /** What the date is, e.g. "Break clause notice". */
  label: string
  /** ISO yyyy-mm-dd when stated precisely; otherwise the wording from the text. */
  date: string
  note?: string
}

export interface ContractReview {
  /** e.g. "Lease — Unit 4, Marlow" */
  title: string
  parties: string[]
  /** One line: what this contract is and does. */
  summary: string
  dates: ContractDate[]
  /** Key obligations on Peter's side, cited (pN). */
  obligations: string[]
  /** Unusual / onerous / missing clauses worth attention, cited (pN). */
  risks: string[]
}

export type DateUrgency = "past" | "soon" | "later" | "unknown"

const NAME_RE = /contract|agreement|\bnda\b|lease|\bmsa\b|\bsla\b|shareholder|terms of|engagement letter|licence|license agreement/i
const CONTENT_RE =
  /this agreement|the parties|hereinafter|governing law|term and termination|notice period|indemnif|warrant(y|ies)|force majeure|entire agreement/i

/** Is this document a contract? Conservative: a board pack must never be one. */
export function looksLikeContract(fileName: string, pages: ExtractedPage[]): boolean {
  if (NAME_RE.test(fileName)) return true
  const text = pages
    .map((p) => `${p.pageTitle} ${(p.narrative ?? []).map((n) => n.text).join(" ")}`)
    .join(" ")
  return CONTENT_RE.test(text)
}

/**
 * Deterministic urgency for a contract date: past, soon (within 60 days) or
 * later. A date that isn't a precise ISO day is "unknown" — shown, not ranked.
 */
export function dateUrgency(date: string, now: Date = new Date()): DateUrgency {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  if (!m) return "unknown"
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return "unknown"
  const days = Math.floor((d.getTime() - now.getTime()) / 86_400_000)
  if (days < 0) return "past"
  if (days <= 60) return "soon"
  return "later"
}

/** Validate/clamp a model-produced review. Pure, unit-tested. */
export function coerceContractReview(raw: unknown): ContractReview | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const str = (v: unknown, fallback = ""): string =>
    typeof v === "string" && v.trim() ? v.trim() : fallback
  const list = (v: unknown, cap: number): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, cap)
      : []
  const title = str(o.title)
  const summary = str(o.summary)
  if (!title || !summary) return null
  const dates = (Array.isArray(o.dates) ? o.dates : [])
    .map((d): ContractDate | null => {
      if (!d || typeof d !== "object") return null
      const x = d as Record<string, unknown>
      const label = str(x.label)
      const date = str(x.date)
      if (!label || !date) return null
      return { label, date, note: str(x.note) || undefined }
    })
    .filter((x): x is ContractDate => x !== null)
    .slice(0, 8)
  return {
    title,
    parties: list(o.parties, 4),
    summary,
    dates,
    obligations: list(o.obligations, 4),
    risks: list(o.risks, 4),
  }
}

const REVIEW_PROMPT = `You are SHIELD, legal & compliance intelligence for Peter Jones CBE. Review this contract's extracted text and give him what matters — you are a sharp in-house counsel's first pass, NOT a law firm.

Rules (critical):
- Work ONLY from the extracted text. A clause you can't see doesn't exist — if something basic is missing (no term? no notice period?), that is a risk worth flagging.
- Cite pages like (p4) on obligations and risks.
- DATES: extract every date that binds anyone — commencement, expiry, renewal, break clause, notice deadlines, payment milestones. Use ISO format (2026-09-30) when the text states a precise day; otherwise quote the wording exactly ("90 days before expiry"). Never invent or normalise a date the text doesn't state.
- Obligations: the ones binding PETER'S side. Risks: unusual, onerous or missing clauses. End any genuinely serious risk with "— worth counsel's eyes".

Return ONLY JSON:
{"title":"<short name, e.g. 'Lease — Unit 4, Marlow'>","parties":["…"],"summary":"<one line>","dates":[{"label":"<what>","date":"<ISO or exact wording>","note":"<optional>"}],"obligations":["… (pN)"],"risks":["… (pN)"]}`

/** Compact text evidence for the review (contracts are prose-heavy). */
function buildEvidence(pages: ExtractedPage[]): string {
  return pages
    .map((p) => {
      const narrative = (p.narrative ?? []).map((n) => n.text).join("\n")
      const tables = (p.tables ?? [])
        .map((t) => `${t.title}: ${t.rows.map((r) => r.label).join("; ")}`)
        .join("\n")
      return `[p${p.sourcePage}] ${p.pageTitle}\n${narrative}\n${tables}`.trim()
    })
    .join("\n\n")
    .slice(0, 16_000)
}

/** Run the review. Best-effort: null on failure (the upload still stands). */
export async function reviewContract(
  pages: ExtractedPage[],
  apiKey: string
): Promise<ContractReview | null> {
  try {
    const content = await openrouterContent(
      apiKey,
      {
        model: getModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REVIEW_PROMPT },
          { role: "user", content: buildEvidence(pages) },
        ],
      },
      { timeoutMs: 90_000, retries: 2 }
    )
    const a = content.indexOf("{")
    const b = content.lastIndexOf("}")
    return coerceContractReview(JSON.parse(a >= 0 && b > a ? content.slice(a, b + 1) : content))
  } catch {
    return null
  }
}
