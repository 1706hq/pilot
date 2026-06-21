"use client"

/**
 * The client-side orchestrator: a streaming chat + tool-calling loop against
 * OpenRouter (Gemini Flash). Streams tokens into the transcript and lets PILOT
 * call show_on_canvas to render UI (invoices, documents, dashboards, charts)
 * into the right sidebar — the same generator the voice path uses.
 */

import { paintCanvas } from "~/pilot/agents/canvas"
import { buildSystemPrompt } from "~/pilot/agents/personas"
import { webSearch, formatSources } from "~/pilot/agents/web"
import { retrieveContext } from "~/pilot/analyst/store"
import { getContextText } from "~/pilot/storage/context"
import { getModel } from "~/pilot/storage/config"
import { usePilotStore } from "~/pilot/state/store"
import type { AgentId, ChatMessage } from "~/pilot/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MAX_TURNS = 5

const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_on_canvas",
      description:
        "Create and display UI on the canvas (the panel to Peter's right). Use for an INVOICE/bill, a DOCUMENT/report/brief/memo, a DASHBOARD of KPIs, or a single chart/table. Call this whenever Peter asks to make, draft, create, build, show, or pull up any of those.",
      parameters: {
        type: "object",
        required: ["intent"],
        properties: {
          intent: {
            type: "string",
            description:
              "What to create, with any details — only what Peter asked for. E.g. 'invoice the client he named for the amount he gave, net 30 days', 'dashboard of American Golf's KPIs from the uploaded data', or 'one-page brief on the Jessops turnaround'. Do not invent clients, amounts or figures Peter didn't provide.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the LIVE web for current, public information you don't already have — stock/share prices, crypto prices (Bitcoin etc.), market moves, news, sport results and fixtures (e.g. the World Cup), weather, exchange rates, or facts about any public company or person. Returns up-to-date results with sources. Use this whenever Peter asks about anything live, current, or in the public domain — you CAN access the web through this tool, so never tell him you can't. (This is for public data only — Peter's own company figures come from his verified BLACKBOX data, not the web.) After getting results you can also call show_on_canvas to chart or write them up.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description:
              "A focused search query, e.g. 'current Bitcoin price GBP', 'FTSE 100 today', 'World Cup 2026 latest results'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_canvas",
      description:
        "Clear/empty the canvas (the Runway — the panel to Peter's right): removes all cards, dashboards, invoices and files. You MUST call this tool to actually clear it — never just say you've cleared it without calling it. Call it whenever Peter says clear/wipe/empty/reset/get rid of the canvas, the Runway, the screen, or these, or says 'start fresh'.",
      parameters: { type: "object", properties: {} },
    },
  },
]

interface ApiMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

interface ToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

function toApiMessages(conversation: ChatMessage[]): ApiMessage[] {
  return conversation
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
}

let inFlight: AbortController | null = null

export async function sendMessage(text: string, agentOverride?: AgentId) {
  const trimmed = text.trim()
  if (!trimmed) return

  const store = usePilotStore.getState()
  const { config } = store
  store.addMessage({ role: "user", content: trimmed })

  if (!config.openRouterKey) {
    store.addMessage({
      role: "assistant",
      agent: "PILOT",
      content:
        "I don't have an OpenRouter API key configured yet. Add it to `.env.local` (NEXT_PUBLIC_OPENROUTER_API_KEY) and reload.",
    })
    return
  }

  const agent: AgentId = agentOverride ?? store.activeAgent ?? "PILOT"
  store.setActiveAgent(agent)
  store.setPilotState("thinking")

  // BLACKBOX: pull the verified, page-cited facts relevant to this question.
  const kbContext = retrieveContext(trimmed)
  const messages: ApiMessage[] = [
    { role: "system", content: buildSystemPrompt(agent, getContextText(), kbContext) },
    ...toApiMessages(usePilotStore.getState().conversation),
  ]

  const assistantId = store.addMessage({
    role: "assistant",
    agent,
    content: "",
    streaming: true,
  })

  inFlight?.abort()
  inFlight = new AbortController()

  // Loop-guard state: reasoning models (e.g. Gemini) will happily re-call a tool
  // forever instead of answering. We dedupe web_search, cap tool rounds, and
  // never leave an empty bubble.
  let lastWebResult = ""
  let lastCanvasResult = ""
  let searched = false
  let toolRounds = 0

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      // After two rounds of tools, force a final TEXT answer so the model can't
      // keep calling tools in a loop.
      const toolChoice = toolRounds >= 2 ? "none" : "auto"
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: inFlight.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.openRouterKey}`,
          "HTTP-Referer": "https://pilot.local",
          "X-Title": "PILOT",
        },
        body: JSON.stringify({
          model: getModel(),
          messages,
          tools: TOOLS,
          tool_choice: toolChoice,
          stream: true,
          temperature: 0.6,
        }),
      })
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "")
        throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`)
      }

      const { content, toolCalls } = await consumeStream(res.body, (delta) =>
        usePilotStore.getState().appendToMessage(assistantId, delta)
      )

      if (toolCalls.length === 0) break // final text already streamed in

      toolRounds += 1
      // Record the assistant's tool-call turn, run the tools, feed results back.
      messages.push({ role: "assistant", content: content || null, tool_calls: toolCalls })
      for (const tc of toolCalls) {
        let result = "Done."
        try {
          if (tc.function.name === "show_on_canvas") {
            const args = JSON.parse(tc.function.arguments || "{}")
            result = await paintCanvas(String(args.intent ?? ""))
            lastCanvasResult = result
          } else if (tc.function.name === "web_search") {
            const args = JSON.parse(tc.function.arguments || "{}")
            if (searched && lastWebResult) {
              // Already fetched once — don't search again, push it to answer.
              result = `${lastWebResult}\n\n(You already have these live results — do NOT search again. Answer Peter now in a sentence, or call show_on_canvas to chart them.)`
            } else {
              const web = await webSearch(String(args.query ?? ""))
              lastWebResult = web
                ? web.text + formatSources(web.sources)
                : "Web search is unavailable right now (check the OpenRouter key)."
              result = lastWebResult
              searched = true
            }
          } else if (tc.function.name === "clear_canvas") {
            usePilotStore.getState().clearWidgets()
            result = "Cleared the Runway."
            lastCanvasResult = result
          }
        } catch (e) {
          result = `Tool error: ${e instanceof Error ? e.message : String(e)}`
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: result })
      }
      // Loop: next completion streams PILOT's spoken confirmation into the bubble.
    }

    // Never leave an empty bubble: if tools ran but the model produced no text,
    // fall back to the most useful tool result we have.
    const finalMsg = usePilotStore
      .getState()
      .conversation.find((m) => m.id === assistantId)
    if (!finalMsg?.content?.trim()) {
      const fallback = lastWebResult || lastCanvasResult || "Done."
      usePilotStore.getState().updateMessage(assistantId, { content: fallback })
    }
    usePilotStore.getState().updateMessage(assistantId, { streaming: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const current = usePilotStore.getState().conversation.find((m) => m.id === assistantId)
    usePilotStore.getState().updateMessage(assistantId, {
      streaming: false,
      content: current?.content || `⚠️ ${message}`,
    })
  } finally {
    usePilotStore.getState().setPilotState("idle")
    inFlight = null
  }
}

/** Parse an OpenAI-style SSE stream; emit content deltas, assemble tool calls. */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""
  const toolAcc: Record<number, ToolCall> = {}

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith("data:")) continue
      const data = line.slice(5).trim()
      if (data === "[DONE]") continue
      let json: {
        choices?: {
          delta?: {
            content?: string
            tool_calls?: {
              index: number
              id?: string
              function?: { name?: string; arguments?: string }
            }[]
          }
        }[]
      }
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }
      const delta = json.choices?.[0]?.delta
      if (!delta) continue
      if (typeof delta.content === "string" && delta.content) {
        content += delta.content
        onDelta(delta.content)
      }
      for (const tc of delta.tool_calls ?? []) {
        const acc = (toolAcc[tc.index] ??= {
          id: "",
          type: "function",
          function: { name: "", arguments: "" },
        })
        if (tc.id) acc.id = tc.id
        if (tc.function?.name) acc.function.name = tc.function.name
        if (tc.function?.arguments) acc.function.arguments += tc.function.arguments
      }
    }
  }

  const toolCalls = Object.values(toolAcc).filter((t) => t.function.name)
  // Ensure every tool call has an id (some providers omit it mid-stream).
  toolCalls.forEach((t, i) => {
    if (!t.id) t.id = `call_${i}`
  })
  return { content, toolCalls }
}
