/**
 * BLACKBOX Stages 4 & 5 — analyze, then self-critique. Both reason ONLY over the
 * consolidated ledger (never the PDF). Every claim must cite the source pages of
 * the figures it's built on; unsupported claims are removed in the critique pass.
 *
 * Pure functions (apiKey passed in) so the app and the verification harness run
 * identical logic.
 */

import { openrouterContent } from "~/pilot/agents/openrouter"
import type { Consolidated } from "~/pilot/analyst/consolidate"
import type { Insight, LedgerRecord, QAEntry } from "~/pilot/analyst/types"

/** Reasoning over text is cheap; use a strong model but not necessarily vision. */
export const ANALYSIS_MODEL = "google/gemini-3.1-pro-preview"

export interface AnalysisResult {
  summary: string
  insights: Insight[]
  qa: QAEntry[]
}

interface Opts {
  apiKey: string
  model?: string
}

/** Compact, fully-cited rendering of the ledger for the model to reason over. */
export function ledgerToText(ledger: LedgerRecord[]): string {
  return ledger
    .map((r) => {
      const p: string[] = [`act ${r.value}${r.unit ?? ""}`]
      if (r.bud !== undefined) p.push(`bud ${r.bud}`)
      if (r.vsBud !== undefined) p.push(`vsBud ${r.vsBud}`)
      if (r.vsBudPct !== undefined) p.push(`vsBud% ${r.vsBudPct}`)
      if (r.vsLY !== undefined) p.push(`vsLY ${r.vsLY}`)
      if (r.lflPct !== undefined) p.push(`LFL% ${r.lflPct}`)
      return `[p${r.sourcePage}] ${r.grain} | ${r.metric} | ${r.dimension}: ${p.join(", ")}`
    })
    .join("\n")
}

async function callJson(messages: unknown[], opts: Opts): Promise<unknown> {
  const content = await openrouterContent(
    opts.apiKey,
    {
      model: opts.model || ANALYSIS_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    },
    { timeoutMs: 120_000, retries: 3 }
  )
  const a = content.indexOf("{")
  const b = content.lastIndexOf("}")
  return JSON.parse(a >= 0 && b > a ? content.slice(a, b + 1) : content)
}

const ANALYZE_PROMPT = `You are a CFO/COO analysing a GROUNDED metrics ledger for Peter Jones. Each row is already verified and tagged with its source page [pN].
Reason ONLY over the ledger below. Do NOT invent or estimate any figure. Every claim MUST cite the source page(s) of the figures it uses.
Produce JSON:
{"summary": "<layered exec summary: headline, key movements, watch-items>",
 "insights": [{"headline": str, "detail": str, "kind": "movement"|"risk"|"opportunity", "magnitudeGbpK": <number, optional>, "citations": [<page ints>]}],
 "qa": [{"question": "<a question Peter/a CEO would actually ask>", "answer": str, "citations": [<page ints>]}]}
Include NON-OBVIOUS insights (e.g. ATV up but transactions down = footfall problem not product; multi-year LFL trend = structural not a bad week; strong channel margin = accelerate). Rank insights by importance. Give £ magnitude where the ledger supports it. 8-14 insights, 8-12 Q&A.`

export async function analyze(c: Consolidated, opts: Opts): Promise<AnalysisResult> {
  const text = ledgerToText(c.ledger)
  const narr = c.narrative.slice(0, 60).map((n) => `[p${n.sourcePage}] ${n.text}`).join("\n")
  const out = (await callJson(
    [
      { role: "system", content: ANALYZE_PROMPT },
      { role: "user", content: `LEDGER:\n${text}\n\nNARRATIVE/ACTIONS:\n${narr}` },
    ],
    opts
  )) as AnalysisResult
  return { summary: out.summary || "", insights: out.insights || [], qa: out.qa || [] }
}

const CRITIQUE_PROMPT = `You are an auditor. Below is a metrics LEDGER (each row cited [pN]) and a draft ANALYSIS.
Check every insight and Q&A answer: is each number actually present in the ledger? Is every claim cited? Any internal contradiction or figure not traceable to a page?
Remove or correct anything unsupported. Keep only claims grounded in the ledger. Return the corrected JSON in the SAME shape: {"summary":str,"insights":[...],"qa":[...]}.`

export async function critique(
  c: Consolidated,
  draft: AnalysisResult,
  opts: Opts
): Promise<AnalysisResult> {
  const out = (await callJson(
    [
      { role: "system", content: CRITIQUE_PROMPT },
      {
        role: "user",
        content: `LEDGER:\n${ledgerToText(c.ledger)}\n\nDRAFT ANALYSIS:\n${JSON.stringify(draft)}`,
      },
    ],
    opts
  )) as AnalysisResult
  return {
    summary: out.summary || draft.summary,
    insights: out.insights || draft.insights,
    qa: out.qa || draft.qa,
  }
}
