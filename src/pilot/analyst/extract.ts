"use client"

/**
 * BLACKBOX Stage 1 — faithful, per-page extraction. ONE vision call per page
 * image, temperature 0, structured JSON out. It TRANSCRIBES only — never
 * interprets — preserving signs (parentheses = negative), units (£k/%), the
 * column meaning, and the page's grain. Illegible cells are marked "unreadable",
 * never guessed.
 *
 * Validated against page 11 of the FY27 Wk19 AGT pack: the Retail row came back
 * exactly — Bud 2558, ACT 2115, vs Bud -443, vs Bud -17.3%, vs LY -539,
 * LFL -20.7% — matching the pixels, while the PDF text layer reported a wrong
 * "(15%)" variance. That delta is why BLACKBOX exists.
 */

import { usePilotStore } from "~/pilot/state/store"
import type { ExtractedPage } from "~/pilot/analyst/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
/** Strongest vision model wins here — Peter's trust depends on the numbers. */
export const VISION_MODEL = "google/gemini-2.5-pro"

export const EXTRACT_PROMPT = `You are transcribing ONE page of a financial trade pack for an audit trail. Output ONLY a JSON object — no prose, no markdown fences.

ABSOLUTE RULES:
- TRANSCRIBE, do not interpret, summarise, or compute anything.
- Parentheses mean NEGATIVE: "(247)" -> -247, "(17.3%)" -> -17.3.
- Record the unit of every numeric cell: "£k" or "%" (or null if neither).
- Preserve the exact column meaning (Bud / ACT / vs Bud / vs Bud % / vs LY / LFL% etc.).
- If a cell or chart value is illegible, set its value to "unreadable" — NEVER invent it.
- Capture the page's grain/period if the title states it (e.g. "Last Week", "MTD", "N6W", "FY forecast").

Return exactly this shape:
{"sourcePage": <int>, "pageType": "divider|table|chart|narrative|mixed", "grain": <string|null>, "pageTitle": <string>,
 "tables": [{"title": <string>, "columns": [<string>], "rows": [{"label": <string>, "cells": [{"column": <string>, "value": <number|"unreadable">, "unit": "£k"|"%"|null}]}]}],
 "narrative": [{"text": <string>, "owner": <string?>, "due": <string?>, "status": <string?>}],
 "charts": [{"title": <string>, "axes": <string?>, "series": [<string>], "points": [<string>], "note": <string?>}],
 "unreadable": [<string>]}`

interface OpenAIResp {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

/** Strip stray fences and grab the outermost JSON object. */
function parseJson(text: string): unknown {
  let t = text.trim()
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "")
  const a = t.indexOf("{")
  const b = t.lastIndexOf("}")
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  return JSON.parse(t)
}

/**
 * Transcribe a single rendered page (PNG as a base64 data URL or raw base64).
 * Returns the structured page, or null on failure (caller flags the page rather
 * than dropping silently).
 */
export async function extractPage(
  pngBase64: string,
  sourcePage: number,
  model: string = VISION_MODEL
): Promise<ExtractedPage | null> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return null
  const dataUrl = pngBase64.startsWith("data:")
    ? pngBase64
    : `data:image/png;base64,${pngBase64}`
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openRouterKey}`,
        "HTTP-Referer": "https://pilot.local",
        "X-Title": "PILOT",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${EXTRACT_PROMPT}\n\nThis is page ${sourcePage}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as OpenAIResp
    const content = data.choices?.[0]?.message?.content
    if (!content) return null
    const obj = parseJson(content) as ExtractedPage
    return { ...obj, sourcePage }
  } catch {
    return null
  }
}
