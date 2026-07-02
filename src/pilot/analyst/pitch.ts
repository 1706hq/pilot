"use client"

/**
 * PEGASUS — the pitch screener. When Peter uploads an investment deck it rides
 * the SAME accuracy pipeline as a board pack (render → extract → audit →
 * consolidate → validate), then PEGASUS delivers the Dragon's verdict over that
 * verified evidence: the ask, whether the numbers tie out, strengths, concerns,
 * and the questions to put to the founder. Sceptical by default — the job is to
 * protect Peter's time, and a missing figure is reported as missing, never
 * filled in.
 */

import { openrouterContent } from "~/pilot/agents/openrouter"
import type { Consolidated } from "~/pilot/analyst/consolidate"
import type { ExtractedPage } from "~/pilot/analyst/types"
import { getModel } from "~/pilot/storage/config"

export interface PitchVerdict {
  /** The company pitching. */
  company: string
  /** What they do, one line. */
  oneLiner: string
  /** The ask as stated: "£500k for 10% (£5m pre-money)" — or "Not stated in the deck". */
  ask: string
  sector: string
  /** Dragon score 1–5: 1 = walk away, 5 = fight for it. */
  score: number
  /** The one-line call. */
  verdict: string
  strengths: string[]
  concerns: string[]
  /** The questions to put to the founder. */
  questions: string[]
}

const NAME_RE = /pitch|deck|invest|raise|fundrais|seed|series[\s-_]?[a-c]\b|teaser/i
const CONTENT_RE =
  /pre-?money|post-?money|valuation|equity offered|the ask|use of funds|investment opportunity|\bseis\b|\beis\b|cap ?table|raising £|we are raising|investment sought/i

/**
 * Is this document a pitch deck? Filename signal (pitch/deck/raise/…) or
 * content signal (an ask, a valuation, use of funds…) across the extracted
 * pages. Deliberately conservative: a KPI tracker or board pack must never be
 * screened as a pitch.
 */
export function looksLikePitch(fileName: string, pages: ExtractedPage[]): boolean {
  if (NAME_RE.test(fileName)) return true
  const text = pages
    .map(
      (p) =>
        `${p.pageTitle} ${(p.narrative ?? []).map((n) => n.text).join(" ")} ${(p.tables ?? [])
          .map((t) => t.title)
          .join(" ")}`
    )
    .join(" ")
  return CONTENT_RE.test(text)
}

/** Validate/clamp a model-produced verdict. Pure, unit-tested. */
export function coercePitchVerdict(raw: unknown): PitchVerdict | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const str = (v: unknown, fallback = ""): string =>
    typeof v === "string" && v.trim() ? v.trim() : fallback
  const list = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 3)
      : []
  const company = str(o.company)
  const verdict = str(o.verdict)
  if (!company || !verdict) return null
  const rawScore = typeof o.score === "number" ? o.score : Number(o.score)
  const score = Number.isFinite(rawScore) ? Math.min(5, Math.max(1, Math.round(rawScore))) : 3
  return {
    company,
    oneLiner: str(o.oneLiner, "—"),
    ask: str(o.ask, "Not stated in the deck"),
    sector: str(o.sector, "—"),
    score,
    verdict,
    strengths: list(o.strengths),
    concerns: list(o.concerns),
    questions: list(o.questions),
  }
}

const SCREEN_PROMPT = `You are PEGASUS, the strategy chief for Peter Jones CBE — the lead Dragons' Den investor. He sees hundreds of pitches; your job is to protect his time with a sharp, sceptical screen of this deck.

You are given the deck's extracted evidence: page titles, narrative lines, tables of figures (page-cited) and chart transcriptions. Judge ONLY from this evidence.

Rules (critical):
- Cite pages like (p4) for every concrete claim in strengths/concerns.
- The ask: report EXACTLY what the deck states (amount, equity, valuation). If it isn't stated, say "Not stated in the deck" — never estimate it.
- Check the numbers: do revenue/growth/margin claims tie together? A claim that doesn't add up is a concern with the pages cited.
- Missing basics (no financials, no traction evidence, no team) are concerns — say what's absent.
- Be a Dragon: sceptical, concrete, fair. Score 1–5 (1 = walk away, 5 = fight for it). The verdict is one punchy line Peter can act on.
- 2–3 strengths, 2–3 concerns, 2–3 questions for the founder. Questions should expose the weakest claim.

Return ONLY JSON:
{"company":"<name>","oneLiner":"<what they do>","ask":"<as stated or 'Not stated in the deck'>","sector":"<sector>","score":<1-5>,"verdict":"<one line>","strengths":["… (pN)"],"concerns":["… (pN)"],"questions":["…"]}`

/** Compact evidence block from the verified extraction (page-cited). */
function buildEvidence(pages: ExtractedPage[], consolidated: Consolidated): string {
  const pageBlocks = pages.map((p) => {
    const tables = (p.tables ?? [])
      .map(
        (t) =>
          `  TABLE ${t.title}: ` +
          t.rows
            .slice(0, 8)
            .map((r) => `${r.label}: ${r.cells.map((c) => `${c.column}=${c.value}${c.unit ?? ""}`).join(", ")}`)
            .join(" | ")
      )
      .join("\n")
    const narrative = (p.narrative ?? []).map((n) => `  "${n.text}"`).join("\n")
    const charts = (p.charts ?? []).map((c) => `  CHART ${c.title}: ${(c.points ?? []).join(", ")}`).join("\n")
    return `[p${p.sourcePage}] ${p.pageTitle}\n${[tables, narrative, charts].filter(Boolean).join("\n")}`
  })
  const figures = consolidated.ledger
    .slice(0, 40)
    .map((r) => `${r.metric} · ${r.dimension}: ${r.value}${r.unit ?? ""} [p${r.sourcePage}]`)
    .join("\n")
  return `${pageBlocks.join("\n\n")}\n\nCONSOLIDATED FIGURES:\n${figures}`.slice(0, 14_000)
}

/** Run the screen. Best-effort: null on any failure (the deck's normal analysis
 *  still stands — a failed verdict never fails the upload). */
export async function screenPitch(
  pages: ExtractedPage[],
  consolidated: Consolidated,
  apiKey: string
): Promise<PitchVerdict | null> {
  try {
    const content = await openrouterContent(
      apiKey,
      {
        model: getModel(),
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCREEN_PROMPT },
          { role: "user", content: buildEvidence(pages, consolidated) },
        ],
      },
      { timeoutMs: 90_000, retries: 2 }
    )
    const a = content.indexOf("{")
    const b = content.lastIndexOf("}")
    return coercePitchVerdict(JSON.parse(a >= 0 && b > a ? content.slice(a, b + 1) : content))
  } catch {
    return null
  }
}
