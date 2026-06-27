"use client"

/**
 * Canvas generation: turn a freeform intent into the RIGHT piece of UI — an
 * invoice, a document/report, a dashboard, or a single chart/table — using
 * Gemini to produce a typed JSON spec. Drives both the voice show_on_canvas
 * tool and the text path's render_ui tool.
 */

import { retrieveContext } from "~/pilot/analyst/store"
import { webSearch } from "~/pilot/agents/web"
import { openrouterContent } from "~/pilot/agents/openrouter"
import { getModel } from "~/pilot/storage/config"
import { getContextText } from "~/pilot/storage/context"
import { usePilotStore } from "~/pilot/state/store"
import type { AgentId } from "~/pilot/types"
import type { WidgetBody } from "~/pilot/widgets/types"

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function schemaPrompt(contextText: string, kbText: string): string {
  const hasReal = Boolean(kbText || contextText)
  const sources = [
    kbText
      ? `## VERIFIED DATA (BLACKBOX) — authoritative, page-cited figures from Peter's analysed documents
${kbText}`
      : "",
    contextText
      ? `## Peter's uploaded text\n${contextText}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const grounding = hasReal
    ? `\n\n${sources}

GROUNDING RULES (critical — Peter checks these against reality):
- For any of PETER'S COMPANIES' numbers, KPIs, financials or metrics, use ONLY figures that appear in the data above. Do NOT round, adjust, or "improve" them. Prefer the VERIFIED (BLACKBOX) figures.
- If the intent asks for one of his companies' numbers and that company is NOT in the data above, do NOT invent figures — return a "document" naming exactly what Peter should upload.
- You MAY freely use any figures the intent itself supplies (e.g. an invoice amount, or live market/sport/public data the user already fetched and pasted into the intent) — chart or tabulate those as asked.
- When you build a widget from his analysed/uploaded data, set a top-level "source" field naming it, e.g. "source":"FY27 Wk19 AGT Trade Pack.pdf".`
    : `\n\n## No company data analysed yet
Peter has no analysed documents. You have NO real figures for his companies.
GROUNDING RULES (critical):
- Do NOT invent financial figures, KPIs or metrics for any of his companies. If the intent asks for a company's numbers, return a "document" naming exactly what Peter should upload.
- You MAY still use numbers the intent supplies directly (an invoice amount, or live market/sport/public data already fetched into the intent) — chart or tabulate those as asked.`

  return `You generate UI for PILOT, the command centre for Peter Jones CBE (portfolio incl. American Golf, Jessops, Levi Roots, Gener8). Given an intent, return ONLY ONE JSON object — no prose, no markdown fences. Pick the BEST type for the intent:

1) "invoice" — when asked to create/make/draft/raise an invoice or bill:
{"type":"invoice","number":"INV-<4 digits>","issueDate":"${today()}","dueDate":"<e.g. 30 days out, optional>","currency":"£","from":{"name":"PJ Investment Group","lines":["Marlow, UK","accounts@pjinvestment.co.uk"]},"to":{"name":"<client name>","lines":["<optional address / email>"]},"items":[{"description":"<service>","quantity":<NUMBER>,"unitPrice":<NUMBER>}],"taxRate":<20 if VAT applies else omit>,"notes":"<optional, e.g. payment terms>"}
quantity and unitPrice MUST be numbers. Use the amounts and client the user gives in the intent.

2) "document" — for a report, brief, summary, memo, plan, agenda, notes, or any prose deliverable:
{"type":"document","title":"<title>","subtitle":"<optional>","body":"<markdown using ## headings, **bold**, and * bullets>"}

3) "dashboard" — for KPIs / metrics / "show me the numbers" / portfolio or company performance:
{"type":"dashboard","title":"<title>","children":[ 2-5 of the widgets below ]}
   stat:  {"type":"stat","label":"<metric>","value":"<£1.2M or 43.5%>","delta":{"value":"<+12% YoY>","direction":"up|down|flat"},"accent":"blue|green|amber|red|violet"}
   chart: {"type":"chart","variant":"line|bar","title":"<title>","yFormat":"number|currency|percent","series":[{"name":"<name>","points":[{"x":"<label>","y":<number>}]}]}  (<=6 points)
   table: {"type":"table","title":"<title>","columns":[{"key":"k","label":"L","align":"left|right"}],"rows":[{"k":"value"}]}

4) A single "chart", "table" or "stat" object when that alone answers the intent.

Pre-format stat values as strings ("£1.2M","43.5%"). Make it specific to the intent.${grounding}

Output ONLY the JSON object.`
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

/**
 * Call Gemini to produce the right widget spec for the given intent, GROUNDED in
 * whatever Peter has uploaded. Returns the spec plus the source file (if the
 * model drew its figures from a real upload) so the canvas can show provenance.
 */
export async function generateCanvas(
  intent: string
): Promise<{ body: WidgetBody; source?: string } | null> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return null
  try {
    // Ground the canvas in BLACKBOX's verified, page-cited figures (so charts and
    // dashboards of the analysed packs work), plus any raw uploaded text.
    const kbText = retrieveContext(intent, 30)
    const contextText = getContextText(6000)
    const content = await openrouterContent(
      config.openRouterKey,
      {
        model: getModel(),
        messages: [
          { role: "system", content: schemaPrompt(contextText, kbText) },
          { role: "user", content: `Intent: ${intent}` },
        ],
        response_format: { type: "json_object" },
        // Low temperature: when grounding in real figures, drift is the enemy.
        temperature: 0.2,
      },
      { timeoutMs: 90_000, retries: 3 }
    )
    const parsed = JSON.parse(stripFences(content)) as Record<string, unknown>
    const body = coerce(parsed)
    if (!body) return null
    const source =
      typeof parsed.source === "string" && parsed.source.trim()
        ? parsed.source.trim()
        : undefined
    return { body, source }
  } catch {
    return null
  }
}

/**
 * The voice path's `live_search` tool — now backed by REAL web access. Pulls
 * current public data (prices, news, sport, weather) and returns one spoken line.
 */
export async function quickLine(query: string): Promise<string> {
  const web = await webSearch(query, { spoken: true })
  return web?.text || "I couldn't pull that from the web just now."
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
  const result = await generateCanvas(intent)
  if (!result) {
    store.updateTask(taskId, { status: "error" })
    return `I couldn't build that just now.`
  }
  const { body, source } = result
  const agent = agentFor(body)
  store.updateTask(taskId, { agent })
  store.addWidget(body, agent, source)
  store.updateTask(taskId, { status: "done" })

  const kind =
    body.type === "invoice"
      ? "The invoice is ready on the canvas — you can download it as a PDF."
      : body.type === "document"
        ? `"${(body as { title?: string }).title ?? "Document"}" is on the canvas.`
        : "Done — it's on the canvas."
  return kind
}
