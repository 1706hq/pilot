"use client"

/**
 * RADAR — PILOT's proactive intelligence. It scans everything BLACKBOX has
 * analysed and surfaces the NON-OBVIOUS: the signal behind the obvious number,
 * second-order effects, leading indicators, hidden risks AND opportunities, and
 * things worth improving. Each reading is grounded in real figures (with a source
 * page) and tappable to explore in depth.
 *
 * Aviation framing: turbulence (a risk to watch), tailwind (an opportunity to
 * press), signal (a notable pattern worth a closer look).
 *
 * Generated once per data state and cached; a bundled default makes the first
 * open instant for the pre-seeded data, then it regenerates when data changes.
 */

import { getModel } from "~/pilot/storage/config"
import { listKnowledgeBases } from "~/pilot/analyst/store"
import { usePilotStore } from "~/pilot/state/store"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const CACHE_KEY = "pilot.radar.v1"

export type RadarKind = "turbulence" | "tailwind" | "signal"

export interface RadarReading {
  id: string
  kind: RadarKind
  /** Intriguing, specific hook. */
  headline: string
  /** The grounded insight, with the number and why it matters. */
  detail: string
  /** The exact question Peter taps to explore it. */
  prompt: string
}

/** Everyday exec questions — the reactive starters, shown alongside the readings. */
export const STARTERS: { label: string; prompt: string }[] = [
  { label: "What needs my decision today?", prompt: "What across the portfolio needs my decision today?" },
  { label: "Biggest risk this week", prompt: "What's the single biggest risk across my companies right now, and how big is it?" },
  { label: "How's cash looking?", prompt: "How is cash and runway looking across the portfolio?" },
  { label: "Where are we winning?", prompt: "Where am I winning right now? Show me the strongest areas across the portfolio." },
]

/** A short signature of the current data, so we only regenerate when it changes. */
function dataSignature(): string {
  return listKnowledgeBases()
    .map((kb) => `${kb.docId}:${kb.builtAt}`)
    .sort()
    .join("|")
}

/** Compact, cited synthesis of the analysed data for RADAR to reason over. */
function buildInput(): string {
  const kbs = listKnowledgeBases()
  return kbs
    .map((kb) => {
      const insights = (kb.insights ?? [])
        .map((i) => `- ${i.headline ?? ""}: ${i.detail ?? ""}${i.citations?.length ? ` (p${i.citations.join(",p")})` : ""}`)
        .join("\n")
      const totals = (kb.ledger ?? [])
        .filter((r) => /total|net sales|margin|risk|churn|cash|runway|mrr|ebitda/i.test(r.metric ?? ""))
        .slice(0, 24)
        .map((r) => {
          const p: string[] = [`${r.value}${r.unit ?? ""}`]
          if (r.bud !== undefined) p.push(`bud ${r.bud}`)
          if (r.vsBudPct !== undefined) p.push(`vsBud ${r.vsBudPct}%`)
          if (r.lflPct !== undefined) p.push(`LFL ${r.lflPct}%`)
          return `  ${r.metric} · ${r.dimension} · ${r.grain}: ${p.join(", ")} [p${r.sourcePage}]`
        })
        .join("\n")
      return `### ${kb.company} — ${kb.period}\n${kb.summary ?? ""}\nINSIGHTS:\n${insights}\nKEY FIGURES:\n${totals}`
    })
    .join("\n\n")
    .slice(0, 9000)
}

const RADAR_PROMPT = `You are PILOT's RADAR — a sharp, perceptive advisor scanning Peter Jones's analysed company data for what he might NOT think to look at. Surface the non-obvious: the signal behind the obvious number, second-order effects, leading indicators, hidden risks AND hidden opportunities, and specific things worth improving. Skip the obvious top-line figures he already knows.

Classify every reading:
- "turbulence" — a risk, warning, or something quietly deteriorating he should watch.
- "tailwind" — an opportunity, a strength to lean into, or a positive he could press harder.
- "signal" — a notable pattern, anomaly or connection worth a closer look, not clearly good or bad.

Rules:
- Ground EVERY reading in the actual figures provided, and cite the source page like "(p14)".
- Be specific and concrete — use the real numbers. No vague platitudes.
- Look for connections he'd miss: one metric explaining another, a leading indicator, a cross-company pattern, a second-order effect.
- Make him think "I wouldn't have spotted that."

Return ONLY JSON:
{"readings":[{"kind":"turbulence|tailwind|signal","headline":"<intriguing, specific, 6-11 words>","detail":"<1-2 sentences: the insight, the number, why it matters, with (pN)>","prompt":"<the exact question Peter taps to explore this in depth>"}]}
Give 5 to 6 readings, a deliberate mix of turbulence and tailwind, ranked by how valuable and non-obvious they are.`

interface Cached {
  signature: string
  readings: RadarReading[]
}

function readCache(): Cached | null {
  if (typeof window === "undefined") return null
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null") as Cached | null
  } catch {
    return null
  }
}

/** The readings to show right now — cache if it matches, else the bundled default. */
export function getRadar(): RadarReading[] {
  const cached = readCache()
  if (cached && cached.signature === dataSignature()) return cached.readings
  return DEFAULT_RADAR
}

/** True when the cache is stale (data changed) and we should regenerate. */
export function radarIsStale(): boolean {
  const cached = readCache()
  return !cached || cached.signature !== dataSignature()
}

/**
 * Generate fresh RADAR readings from the current data and cache them. One model
 * call over the already-extracted insights/figures, so it's fast and grounded.
 */
export async function generateRadar(): Promise<RadarReading[]> {
  const { config } = usePilotStore.getState()
  if (!config.openRouterKey) return getRadar()
  const input = buildInput()
  if (!input.trim()) return getRadar()
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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RADAR_PROMPT },
          { role: "user", content: input },
        ],
      }),
    })
    if (!res.ok) return getRadar()
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content || "{}"
    const a = content.indexOf("{")
    const b = content.lastIndexOf("}")
    const parsed = JSON.parse(a >= 0 && b > a ? content.slice(a, b + 1) : content) as {
      readings?: Omit<RadarReading, "id">[]
    }
    const readings: RadarReading[] = (parsed.readings ?? [])
      .filter((r) => r.headline && r.prompt)
      .slice(0, 6)
      .map((r, i) => ({
        id: `radar_${i}`,
        kind: (["turbulence", "tailwind", "signal"].includes(r.kind) ? r.kind : "signal") as RadarKind,
        headline: r.headline,
        detail: r.detail ?? "",
        prompt: r.prompt,
      }))
    if (readings.length) {
      try {
        window.localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ signature: dataSignature(), readings })
        )
      } catch {
        /* quota — fine, we still return them */
      }
      return readings
    }
    return getRadar()
  } catch {
    return getRadar()
  }
}

/**
 * Bundled default readings for the pre-seeded American Golf data, so the very
 * first open is instant and strong. Regenerated the moment new data is analysed.
 */
export const DEFAULT_RADAR: RadarReading[] = [
  {
    id: "seed_0",
    kind: "turbulence",
    headline: "Your strong margin is hiding a footfall collapse",
    detail:
      "American Golf held margin at 42.2% and even grew ATV, so the P&L looks defended — but transactions fell ~28% and the real problem is people not walking in, not what they spend (p11, p4).",
    prompt:
      "American Golf's margin held up but transactions fell sharply. Is the sales miss a footfall problem rather than a pricing or product one, and what's driving it?",
  },
  {
    id: "seed_1",
    kind: "turbulence",
    headline: "The 2-year LFL says this is structural, not a bad week",
    detail:
      "Week 19 looks like a blip, but the 2-year like-for-like is deeply negative while budget assumed strong growth — the gap is a structural demand issue the weekly number masks (p1).",
    prompt:
      "Compare American Golf's 1-year and 2-year like-for-like. Is the decline structural rather than a one-off bad week, and what does that mean for the forecast?",
  },
  {
    id: "seed_2",
    kind: "tailwind",
    headline: "Ecommerce is quietly outrunning the stores",
    detail:
      "Web margin rate is up ~2.8pts year on year and L4W web category sales are well up, while stores struggle — the channel mix is shifting and may be under-backed (p56, p57).",
    prompt:
      "Ecommerce looks much stronger than retail right now. Should I be shifting more investment to the web channel, and where exactly is it winning?",
  },
  {
    id: "seed_3",
    kind: "signal",
    headline: "A £1.7m run-rate risk concentrated in Clubs",
    detail:
      "The next-6-weeks run rate flags about £1.7m of sales risk, with roughly £1.06m of it sitting in Clubs alone (Custom, Irons, Woods) — one category is carrying most of the exposure (p14, p15).",
    prompt:
      "Break down the £1.7m N6W run-rate risk by category. Why is Clubs carrying most of it, and what would move the number most?",
  },
  {
    id: "seed_4",
    kind: "turbulence",
    headline: "Delivery complaints are a margin risk in disguise",
    detail:
      "TrustScore is steady at 4.7, but the negative reviews cluster on delivery delays and stock — the kind of friction that quietly raises customer-service cost and dents repeat purchase (p19, p20).",
    prompt:
      "Customers are complaining about delivery and stock despite a high TrustScore. How big could this be as a hidden cost and retention risk?",
  },
  {
    id: "seed_5",
    kind: "signal",
    headline: "Two new stores are dragging the opening programme",
    detail:
      "Blanchardstown is ~65% and Go Northampton ~54% behind target year-to-date, while Chichester runs ahead — the average hides two very different stories worth separating (p16, p93, p94).",
    prompt:
      "How are the new store openings really performing? Separate the ones beating target from the two that are well behind, and what's different about them.",
  },
]
