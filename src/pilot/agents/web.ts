"use client"

/**
 * Live web access for PILOT. Peter asks about things OUTSIDE his own data all the
 * time — market/stock/crypto prices, news, sport results, weather, public company
 * facts. This uses OpenRouter's built-in `web` plugin (no extra key — rides the
 * same OpenRouter key), so the model answers from up-to-date results with sources.
 *
 * Used by the text orchestrator's `web_search` tool and the voice `live_search`
 * tool. Returns the answer text plus the source citations OpenRouter attached.
 */

import { getModel } from "~/pilot/storage/config"
import { usePilotStore } from "~/pilot/state/store"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

interface Annotation {
  type?: string
  url_citation?: { url?: string; title?: string }
}
interface Resp {
  choices?: { message?: { content?: string; annotations?: Annotation[] } }[]
}

export interface WebResult {
  text: string
  sources: { title?: string; url?: string }[]
}

/**
 * Search the live web and return a concise answer. `spoken: true` returns a
 * single sentence for the voice path; otherwise a short, specific written answer.
 */
export async function webSearch(
  query: string,
  opts: { spoken?: boolean } = {}
): Promise<WebResult | null> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return null
  const system = opts.spoken
    ? "You are PILOT, briefing Peter Jones out loud. Using the live web results, answer in ONE concise spoken British-English sentence, leading with the key figure or fact. No preamble, don't read URLs aloud."
    : "You are PILOT, answering Peter Jones with current information from the live web results. Lead with the figure or answer, then a line of context. Concise, specific, British English."
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
        model: getModel(),
        // OpenRouter's web plugin augments the model with live search results.
        plugins: [{ id: "web", max_results: 5 }],
        messages: [
          { role: "system", content: system },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Resp
    const msg = data.choices?.[0]?.message
    const text = msg?.content?.trim()
    if (!text) return null
    const sources = (msg?.annotations ?? [])
      .filter((a) => a.type === "url_citation" && a.url_citation?.url)
      .map((a) => ({ title: a.url_citation?.title, url: a.url_citation?.url }))
    return { text, sources }
  } catch {
    return null
  }
}

/** Format sources compactly for feeding back to the model / reading. */
export function formatSources(sources: WebResult["sources"], max = 3): string {
  if (!sources.length) return ""
  return (
    "\n\nSources: " +
    sources
      .slice(0, max)
      .map((s) => s.title || s.url)
      .filter(Boolean)
      .join(" · ")
  )
}
