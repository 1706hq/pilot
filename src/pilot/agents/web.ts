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

import { openrouterMessage } from "~/pilot/agents/openrouter"
import { getModel } from "~/pilot/storage/config"
import { usePilotStore } from "~/pilot/state/store"

export interface WebResult {
  text: string
  sources: { title?: string; url?: string }[]
}

/**
 * Search the live web and return a concise answer. `spoken: true` returns a
 * single sentence for the voice path; otherwise a short, specific written answer.
 * Rides the resilient OpenRouter layer (timeout + retry) — a hung search used
 * to stall the whole tool round.
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
    const { content, annotations } = await openrouterMessage(
      config.openRouterKey,
      {
        model: getModel(),
        // OpenRouter's web plugin augments the model with live search results.
        plugins: [{ id: "web", max_results: 5 }],
        messages: [
          { role: "system", content: system },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      },
      { timeoutMs: 45_000, retries: 2 }
    )
    const text = content.trim()
    if (!text) return null
    const sources = annotations
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
