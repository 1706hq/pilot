"use client"

/**
 * Canvas generation: turn a freeform intent into the RIGHT piece of UI — an
 * invoice, a document/report, a dashboard, or a single chart/table — using
 * Gemini to produce a typed JSON spec. Drives both the voice show_on_canvas
 * tool and the text path's render_ui tool.
 */

import { OPENROUTER_MODEL } from "~/pilot/storage/config"
import { usePilotStore } from "~/pilot/state/store"
import type { AgentId } from "~/pilot/types"
import type { WidgetBody } from "~/pilot/widgets/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function schemaPrompt(): string {
  return `You generate UI for PILOT, the command centre for Peter Jones CBE (portfolio incl. American Golf, Jessops, Levi Roots, Gener8). Given an intent, return ONLY ONE JSON object — no prose, no markdown fences. Pick the BEST type for the intent:

1) "invoice" — when asked to create/make/draft/raise an invoice or bill:
{"type":"invoice","number":"INV-<4 digits>","issueDate":"${today()}","dueDate":"<e.g. 30 days out, optional>","currency":"£","from":{"name":"PJ Investment Group","lines":["Marlow, UK","accounts@pjinvestment.co.uk"]},"to":{"name":"<client name>","lines":["<optional address / email>"]},"items":[{"description":"<service>","quantity":<NUMBER>,"unitPrice":<NUMBER>}],"taxRate":<20 if VAT applies else omit>,"notes":"<optional, e.g. payment terms>"}
quantity and unitPrice MUST be numbers. Infer sensible line items, amounts and a client from the intent.

2) "document" — for a report, brief, summary, memo, plan, agenda, notes, or any prose deliverable:
{"type":"document","title":"<title>","subtitle":"<optional>","body":"<markdown using ## headings, **bold**, and * bullets>"}

3) "dashboard" — for KPIs / metrics / "show me the numbers" / portfolio or company performance:
{"type":"dashboard","title":"<title>","children":[ 2-5 of the widgets below ]}
   stat:  {"type":"stat","label":"<metric>","value":"<£1.2M or 43.5%>","delta":{"value":"<+12% YoY>","direction":"up|down|flat"},"accent":"blue|green|amber|red|violet"}
   chart: {"type":"chart","variant":"line|bar","title":"<title>","yFormat":"number|currency|percent","series":[{"name":"<name>","points":[{"x":"<label>","y":<number>}]}]}  (<=6 points)
   table: {"type":"table","title":"<title>","columns":[{"key":"k","label":"L","align":"left|right"}],"rows":[{"k":"value"}]}

4) A single "chart", "table" or "stat" object when that alone answers the intent.

Use realistic, plausible figures in GBP. Pre-format stat values as strings ("£1.2M","43.5%"). Make it specific to the intent. Output ONLY the JSON object.`
}

interface OpenAIResp {
  choices?: { message?: { content?: string } }[]
}

function stripFences(text: string): string {
  let t = text.trim()
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "")
  // Grab the outermost JSON object if there's stray prose.
  const first = t.indexOf("{")
  const last = t.lastIndexOf("}")
  if (first >= 0 && last > first) t = t.slice(first, last + 1)
  return t.trim()
}

const INNER_TYPES = new Set(["stat", "chart", "table", "link", "file"])

/** Validate/coerce a model-produced spec into a WidgetBody, or null if unusable. */
function coerce(raw: unknown): WidgetBody | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const type = o.type

  if (type === "invoice") {
    const items = Array.isArray(o.items) ? o.items : []
    if (items.length === 0) return null
    return {
      type: "invoice",
      number: String(o.number ?? "INV-0001"),
      issueDate: String(o.issueDate ?? today()),
      dueDate: o.dueDate ? String(o.dueDate) : undefined,
      currency: typeof o.currency === "string" ? o.currency : "£",
      from: (o.from as never) ?? { name: "PJ Investment Group" },
      to: (o.to as never) ?? { name: "Client" },
      items: items as never,
      taxRate: typeof o.taxRate === "number" ? o.taxRate : undefined,
      notes: o.notes ? String(o.notes) : undefined,
    }
  }

  if (type === "document") {
    if (!o.title || !o.body) return null
    return {
      type: "document",
      title: String(o.title),
      subtitle: o.subtitle ? String(o.subtitle) : undefined,
      body: String(o.body),
    }
  }

  if (type === "dashboard") {
    const children = (Array.isArray(o.children) ? o.children : []).filter(
      (c): c is never =>
        !!c && typeof c === "object" && INNER_TYPES.has((c as { type?: string }).type ?? "")
    )
    if (children.length === 0) return null
    return { type: "dashboard", title: o.title ? String(o.title) : undefined, children }
  }

  if (typeof type === "string" && INNER_TYPES.has(type)) {
    return raw as WidgetBody
  }
  return null
}

/** Pick which CREW member a generated piece of UI is attributed to. */
function agentFor(body: WidgetBody): AgentId {
  if (body.type === "invoice") return "STERLING"
  if (body.type === "dashboard" || body.type === "chart" || body.type === "table")
    return "MARSHALL"
  return "PILOT"
}

/** Call Gemini to produce the right widget spec for the given intent. */
export async function generateCanvas(intent: string): Promise<WidgetBody | null> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return null
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
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: schemaPrompt() },
          { role: "user", content: `Intent: ${intent}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as OpenAIResp
    const content = data.choices?.[0]?.message?.content
    if (!content) return null
    return coerce(JSON.parse(stripFences(content)))
  } catch {
    return null
  }
}

export async function quickLine(query: string): Promise<string> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return "I can't reach my sources right now."
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
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Answer in ONE concise spoken sentence for Peter Jones. British English. No preamble.",
          },
          { role: "user", content: query },
        ],
        temperature: 0.4,
      }),
    })
    if (!res.ok) return "I couldn't pull that just now."
    const data = (await res.json()) as OpenAIResp
    return data.choices?.[0]?.message?.content?.trim() || "Nothing notable to report."
  } catch {
    return "I couldn't pull that just now."
  }
}

/**
 * Generate UI for an intent and paint it on the canvas (right sidebar). Returns
 * a short line to read aloud.
 */
export async function paintCanvas(intent: string): Promise<string> {
  const store = usePilotStore.getState()
  const taskId = store.addTask({
    label: `Building: ${intent}`.slice(0, 60),
    agent: "PILOT",
    status: "working",
  })
  const body = await generateCanvas(intent)
  if (!body) {
    store.updateTask(taskId, { status: "error" })
    return `I couldn't build that just now.`
  }
  const agent = agentFor(body)
  store.updateTask(taskId, { agent })
  store.addWidget(body, agent)
  store.updateTask(taskId, { status: "done" })

  const kind =
    body.type === "invoice"
      ? "The invoice is ready on the canvas — you can download it as a PDF."
      : body.type === "document"
        ? `"${(body as { title?: string }).title ?? "Document"}" is on the canvas.`
        : "Done — it's on the canvas."
  return kind
}
