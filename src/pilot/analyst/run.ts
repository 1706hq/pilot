"use client"

/**
 * BLACKBOX pipeline orchestrator. Render → extract (per page) → audit/reconcile
 * → consolidate → analyze → self-critique → store. Long-running by design;
 * reports each stage into the Tasks feed and never blocks the UI.
 */

import { analyze, critique, ANALYSIS_MODEL } from "~/pilot/analyst/analyze"
import { consolidate } from "~/pilot/analyst/consolidate"
import { extractPage, VISION_MODEL } from "~/pilot/analyst/extract"
import { renderPdfToPages } from "~/pilot/analyst/render"
import { saveKnowledgeBase } from "~/pilot/analyst/store"
import { reconcile } from "~/pilot/analyst/verify"
import { usePilotStore } from "~/pilot/state/store"
import type { ExtractedPage, KnowledgeBase } from "~/pilot/analyst/types"

const EXTRACT_CONCURRENCY = 4

/** Run N async tasks with a concurrency cap, in order. */
async function pool<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    })
  )
  return out
}

export interface IngestMeta {
  docId: string
  company: string
  period: string
}

/**
 * Ingest one PDF into a grounded knowledge base. Returns the KB (also stored).
 */
export async function ingestDocument(file: File, meta: IngestMeta): Promise<KnowledgeBase | null> {
  const store = usePilotStore.getState()
  const apiKey = store.config.openRouterKey
  if (!apiKey) {
    store.setNotice("Add your OpenRouter key in Settings to analyse documents.")
    return null
  }
  const taskId = store.addTask({
    label: `BLACKBOX · reading ${meta.company}`,
    agent: "MARSHALL",
    status: "working",
  })
  const setLabel = (label: string) =>
    usePilotStore.getState().updateTask(taskId, { label: label.slice(0, 60) })

  try {
    // Stage 0 — render.
    setLabel(`BLACKBOX · rendering ${meta.company}`)
    const images = await renderPdfToPages(file, {
      onPage: (d, t) => setLabel(`BLACKBOX · rendering ${d}/${t}`),
    })

    // Stage 1 — extract (per page, capped concurrency).
    let extracted = 0
    const pages = (
      await pool(images, EXTRACT_CONCURRENCY, async (img, i) => {
        const page = await extractPage(img, i + 1, VISION_MODEL)
        setLabel(`BLACKBOX · extracting ${++extracted}/${images.length}`)
        return page
      })
    ).filter((p): p is ExtractedPage => Boolean(p))

    // Stage 2 — audit / reconcile.
    setLabel("BLACKBOX · auditing the numbers")
    const rec = reconcile(pages)

    // Stage 3 — consolidate.
    setLabel("BLACKBOX · consolidating")
    const consolidated = consolidate(pages)

    // Stages 4 + 5 — analyze, then self-critique.
    setLabel("BLACKBOX · analysing")
    const draft = await analyze(consolidated, { apiKey, model: ANALYSIS_MODEL })
    setLabel("BLACKBOX · checking its own work")
    const final = await critique(consolidated, draft, { apiKey, model: ANALYSIS_MODEL })

    // Stage 6 — store.
    const kb: KnowledgeBase = {
      docId: meta.docId,
      company: meta.company,
      period: meta.period,
      ledger: consolidated.ledger,
      narrative: consolidated.narrative,
      feedback: consolidated.feedback,
      entities: consolidated.entities,
      summary: final.summary,
      insights: final.insights,
      qa: final.qa,
      flags: rec.flags,
      builtAt: Date.now(),
    }
    saveKnowledgeBase(kb)

    usePilotStore.getState().updateTask(taskId, {
      status: "done",
      label: `BLACKBOX · ${meta.company} ready (${rec.passed}/${rec.checks} reconciled)`,
    })
    usePilotStore
      .getState()
      .setNotice(
        `Analysed ${meta.company}: ${kb.ledger.length} figures, ${kb.insights.length} insights, ${rec.flags.length} flags.`
      )
    return kb
  } catch (e) {
    usePilotStore.getState().updateTask(taskId, {
      status: "error",
      label: `BLACKBOX failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 60),
    })
    return null
  }
}
