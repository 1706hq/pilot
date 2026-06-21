"use client"

/**
 * BLACKBOX Stage 6 — store + retrieve. Persists each document's knowledge base
 * in localStorage (keyed doc→company→period) and, at conversation time, pulls
 * the relevant grounded facts for a query so STERLING/MARSHALL answer from the
 * ledger with citations — never re-reading the PDF or relying on model memory.
 *
 * v1 uses localStorage JSON + keyword retrieval (no embeddings); swap in SQLite
 * via a Tauri plugin if size/scale demands it.
 */

import type { KnowledgeBase, LedgerRecord } from "~/pilot/analyst/types"

const KB_KEY = "pilot.blackbox.v1"

function readAll(): Record<string, KnowledgeBase> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(KB_KEY) || "{}") as Record<string, KnowledgeBase>
  } catch {
    return {}
  }
}

export function saveKnowledgeBase(kb: KnowledgeBase) {
  const all = readAll()
  all[kb.docId] = kb
  try {
    window.localStorage.setItem(KB_KEY, JSON.stringify(all))
  } catch {
    /* quota — a real fix would move to SQLite */
  }
}

export function listKnowledgeBases(): KnowledgeBase[] {
  return Object.values(readAll()).sort((a, b) => b.builtAt - a.builtAt)
}

export function hasKnowledge(): boolean {
  return listKnowledgeBases().length > 0
}

function fmt(r: LedgerRecord): string {
  const p: string[] = [`${r.value}${r.unit ?? ""}`]
  if (r.bud !== undefined) p.push(`bud ${r.bud}`)
  if (r.vsBud !== undefined) p.push(`vsBud ${r.vsBud}`)
  if (r.vsBudPct !== undefined) p.push(`vsBud ${r.vsBudPct}%`)
  if (r.lflPct !== undefined) p.push(`LFL ${r.lflPct}%`)
  return `${r.metric} · ${r.dimension} · ${r.grain}: ${p.join(", ")} [p${r.sourcePage}]`
}

/**
 * Build a compact, CITED context block for a query from all stored KBs. Keyword
 * scoring over metric/dimension/grain; returns the top records + relevant
 * insights + pre-answered Q&A, each tagged with its source page.
 */
export function retrieveContext(query: string, maxRecords = 40): string {
  const kbs = listKnowledgeBases()
  if (kbs.length === 0) return ""
  const q = query.toLowerCase()
  const terms = q.split(/[^a-z0-9%]+/).filter((t) => t.length > 2)
  const score = (s: string) => {
    const l = s.toLowerCase()
    return terms.reduce((n, t) => (l.includes(t) ? n + 1 : n), 0)
  }

  const blocks: string[] = []
  for (const kb of kbs) {
    const ranked = kb.ledger
      .map((r) => ({ r, s: score(`${r.metric} ${r.dimension} ${r.grain} ${r.table ?? ""}`) }))
      .sort((a, b) => b.s - a.s)
    // If nothing matches, still give the headline (Total AGT) rows so it's grounded.
    const chosen = ranked.some((x) => x.s > 0)
      ? ranked.filter((x) => x.s > 0).slice(0, maxRecords)
      : ranked.filter((x) => /total/i.test(x.r.dimension)).slice(0, maxRecords)

    const insights = kb.insights
      .map((i) => ({ i, s: score(`${i.headline} ${i.detail}`) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => `- ${x.i.headline} — ${x.i.detail} [p${x.i.citations.join(",p")}]`)

    const qa = kb.qa
      .map((e) => ({ e, s: score(e.question) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => `Q: ${x.e.question}\nA: ${x.e.answer} [p${x.e.citations.join(",p")}]`)

    blocks.push(
      `### ${kb.company} — ${kb.period} (from ${kb.docId})\n` +
        `FIGURES (each cited to a source page):\n${chosen.map((x) => fmt(x.r)).join("\n")}` +
        (insights.length ? `\n\nINSIGHTS:\n${insights.join("\n")}` : "") +
        (qa.length ? `\n\nRELEVANT Q&A:\n${qa.join("\n")}` : "")
    )
  }
  return blocks.join("\n\n")
}
