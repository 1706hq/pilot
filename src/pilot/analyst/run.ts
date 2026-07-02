"use client"

/**
 * BLACKBOX pipeline orchestrator. Render → extract (per page) → audit/reconcile
 * → consolidate → analyze → self-critique → store. Long-running by design;
 * reports each stage into the Tasks feed and never blocks the UI.
 */

import { analyze, critique, ANALYSIS_MODEL, type AnalysisResult } from "~/pilot/analyst/analyze"
import { consolidate, type Consolidated } from "~/pilot/analyst/consolidate"
import { looksLikePitch, screenPitch } from "~/pilot/analyst/pitch"
import { validateLedger } from "~/pilot/analyst/validate"
import { syncKnowledge } from "~/pilot/sync/sync"
import { extractPage, extractSheet, extractDocChunk, VISION_MODEL } from "~/pilot/analyst/extract"
import { renderPdfToPages } from "~/pilot/analyst/render"
import { saveKnowledgeBase } from "~/pilot/analyst/store"
import { reconcile } from "~/pilot/analyst/verify"
import { usePilotStore } from "~/pilot/state/store"
import type { AuditFlag, ExtractedPage, KnowledgeBase } from "~/pilot/analyst/types"

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

/**
 * Serialise whole-document ingests. Each document already extracts its pages at
 * EXTRACT_CONCURRENCY internally; running several documents at once on top of
 * that fires dozens of concurrent vision calls and triggers rate-limit (429)
 * storms that look like "uploads are broken". This queue runs one document at a
 * time so dropping a folder of files is reliable, just sequential.
 */
let ingestChain: Promise<unknown> = Promise.resolve()
export function enqueueIngest<T>(job: () => Promise<T>): Promise<T> {
  const run = ingestChain.then(job, job)
  ingestChain = run.catch(() => undefined)
  return run
}

/** A flag noting pages/sheets/sections that could not be read, so partial data
 *  is never silently presented as complete. */
function coverageFlag(missed: number, total: number, unit: string): AuditFlag[] {
  if (missed <= 0) return []
  return [
    {
      sourcePage: 0,
      field: "coverage",
      issue: `${missed} of ${total} ${unit} could not be read — figures from them are missing`,
      confidence: 0.3,
    },
  ]
}

export interface IngestMeta {
  docId: string
  company: string
  period: string
}

/**
 * Analyse + self-critique, but NEVER throw the whole document away because the
 * final reasoning step had a wobble. The figures are already extracted and
 * verified by this point; if analyze fails we still save them with a plain
 * summary (Peter can ask about every number), and if the critique pass fails we
 * keep the grounded draft. This is why a transient blip no longer turns a good
 * upload into "BLACKBOX failed".
 */
async function analyseBestEffort(
  consolidated: Consolidated,
  apiKey: string,
  setLabel: (label: string) => void
): Promise<AnalysisResult> {
  let draft: AnalysisResult
  try {
    draft = await analyze(consolidated, { apiKey, model: ANALYSIS_MODEL })
  } catch {
    return {
      summary: `${consolidated.ledger.length} figures captured and verified. Ask me anything about them.`,
      insights: [],
      qa: [],
    }
  }
  setLabel("BLACKBOX · checking its own work")
  try {
    return await critique(consolidated, draft, { apiKey, model: ANALYSIS_MODEL })
  } catch {
    return draft // the critique pass is a bonus; the draft is already grounded.
  }
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
  const ingestId = store.startIngest({ fileName: file.name, company: meta.company })
  const setLabel = (label: string) =>
    usePilotStore.getState().updateTask(taskId, { label: label.slice(0, 60) })
  const setIngest = (patch: Parameters<typeof store.updateIngest>[1]) =>
    usePilotStore.getState().updateIngest(ingestId, patch)

  try {
    // Stage 0 — render.
    setLabel(`BLACKBOX · rendering ${meta.company}`)
    const images = await renderPdfToPages(file, {
      onPage: (d, t) => setLabel(`BLACKBOX · rendering ${d}/${t}`),
    })
    setIngest({ phase: "reading", total: images.length })

    // Stage 1 — extract (per page, capped concurrency).
    let extracted = 0
    const pages = (
      await pool(images, EXTRACT_CONCURRENCY, async (img, i) => {
        const page = await extractPage(img, i + 1, VISION_MODEL)
        setLabel(`BLACKBOX · extracting ${++extracted}/${images.length}`)
        setIngest({ done: extracted })
        return page
      })
    ).filter((p): p is ExtractedPage => Boolean(p))
    if (pages.length === 0) throw new Error("could not read any pages")
    const missed = images.length - pages.length

    // Stage 2 — audit / reconcile.
    setLabel("BLACKBOX · auditing the numbers")
    setIngest({ phase: "auditing" })
    const rec = reconcile(pages)

    // Stage 3 — consolidate.
    setLabel("BLACKBOX · consolidating")
    const consolidated = consolidate(pages)
    const validation = validateLedger(consolidated.ledger)
    consolidated.ledger = validation.ledger

    // Stages 4 + 5 — analyze, then self-critique.
    setLabel("BLACKBOX · analysing")
    setIngest({ phase: "analysing" })
    const final = await analyseBestEffort(consolidated, apiKey, setLabel)

    // PEGASUS — if this reads like a pitch deck, screen it over the SAME
    // verified evidence. Best-effort: a failed screen never fails the upload.
    let pitch: KnowledgeBase["pitch"]
    if (looksLikePitch(file.name, pages)) {
      setLabel("PEGASUS · screening the pitch")
      pitch = (await screenPitch(pages, consolidated, apiKey)) ?? undefined
    }

    // Stage 6 — store.
    const kb: KnowledgeBase = {
      docId: meta.docId,
      company: pitch?.company || meta.company,
      period: meta.period,
      ledger: consolidated.ledger,
      narrative: consolidated.narrative,
      feedback: consolidated.feedback,
      entities: consolidated.entities,
      summary: final.summary,
      insights: final.insights,
      qa: final.qa,
      flags: [...rec.flags, ...validation.flags, ...coverageFlag(missed, images.length, "pages")],
      pitch,
      builtAt: Date.now(),
    }
    saveKnowledgeBase(kb)
    void syncKnowledge() // share the result to Peter's other devices (no-op if off)

    // A screened pitch lands as PEGASUS's verdict card on the Runway.
    if (pitch) {
      usePilotStore.getState().addWidget({ type: "pitch", ...pitch }, "PEGASUS", meta.docId)
    }

    usePilotStore.getState().updateTask(taskId, {
      status: "done",
      ...(pitch ? { agent: "PEGASUS" as const } : {}),
      label: pitch
        ? `PEGASUS · ${kb.company} screened (${pitch.score}/5)`
        : `BLACKBOX · ${meta.company} ready (${rec.passed}/${rec.checks} reconciled)`,
    })
    setIngest({ phase: "ready", figures: kb.ledger.length, missed, readyAt: Date.now() })
    usePilotStore
      .getState()
      .setNotice(
        pitch
          ? `PEGASUS screened the ${kb.company} pitch — verdict is on the Runway (${pitch.score}/5).`
          : `Analysed ${meta.company}: ${kb.ledger.length} figures, ${kb.insights.length} insights${missed > 0 ? `. ${missed} of ${images.length} pages couldn't be read` : ""}.`
      )
    return kb
  } catch (e) {
    usePilotStore.getState().updateTask(taskId, {
      status: "error",
      label: `BLACKBOX failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 60),
    })
    setIngest({ phase: "error", error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

/**
 * Ingest a spreadsheet (.xlsx/.xls/.csv) into the SAME grounded knowledge base a
 * PDF produces. Spreadsheets have no pages to render, so instead of vision we
 * parse each sheet to CSV and transcribe it with extractSheet — then the audit,
 * consolidate, analyse and critique stages are identical to the PDF path. This
 * is why an uploaded Excel now answers as accurately as the pre-seeded packs.
 */
export async function ingestSpreadsheet(
  file: File,
  meta: IngestMeta
): Promise<KnowledgeBase | null> {
  const store = usePilotStore.getState()
  const apiKey = store.config.openRouterKey
  if (!apiKey) {
    store.setNotice("Add your OpenRouter key in Settings to analyse documents.")
    return null
  }
  const taskId = store.addTask({
    label: `BLACKBOX · reading ${meta.company}`,
    agent: "STERLING",
    status: "working",
  })
  const ingestId = store.startIngest({ fileName: file.name, company: meta.company })
  const setLabel = (label: string) =>
    usePilotStore.getState().updateTask(taskId, { label: label.slice(0, 60) })
  const setIngest = (patch: Parameters<typeof store.updateIngest>[1]) =>
    usePilotStore.getState().updateIngest(ingestId, patch)

  try {
    // Parse the workbook to one CSV per non-empty sheet.
    setLabel(`BLACKBOX · opening ${meta.company}`)
    const XLSX = await import("xlsx")
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" })
    const sheets = wb.SheetNames.map((name) => ({
      name,
      csv: XLSX.utils.sheet_to_csv(wb.Sheets[name]).trim(),
    })).filter((s) => s.csv)
    if (sheets.length === 0) throw new Error("no readable sheets")
    setIngest({ phase: "reading", total: sheets.length })

    // Stage 1 — transcribe each sheet (capped concurrency, same as pages).
    let done = 0
    const pages = (
      await pool(sheets, EXTRACT_CONCURRENCY, async (s, i) => {
        const page = await extractSheet(s.csv, i + 1, s.name, VISION_MODEL)
        setLabel(`BLACKBOX · reading sheet ${++done}/${sheets.length}`)
        setIngest({ done })
        return page
      })
    ).filter((p): p is ExtractedPage => Boolean(p))
    if (pages.length === 0) throw new Error("could not read the figures")
    const missed = sheets.length - pages.length

    // Stages 2-6 — identical to the PDF path.
    setLabel("BLACKBOX · auditing the numbers")
    setIngest({ phase: "auditing" })
    const rec = reconcile(pages)
    setLabel("BLACKBOX · consolidating")
    const consolidated = consolidate(pages)
    const validation = validateLedger(consolidated.ledger)
    consolidated.ledger = validation.ledger
    setLabel("BLACKBOX · analysing")
    setIngest({ phase: "analysing" })
    const final = await analyseBestEffort(consolidated, apiKey, setLabel)

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
      flags: [...rec.flags, ...validation.flags, ...coverageFlag(missed, sheets.length, "sheets")],
      builtAt: Date.now(),
    }
    saveKnowledgeBase(kb)
    void syncKnowledge() // share the result to Peter's other devices (no-op if off)

    usePilotStore.getState().updateTask(taskId, {
      status: "done",
      label: `BLACKBOX · ${meta.company} ready (${kb.ledger.length} figures)`,
    })
    setIngest({ phase: "ready", figures: kb.ledger.length, missed, readyAt: Date.now() })
    usePilotStore
      .getState()
      .setNotice(
        `${meta.company} is analysed and ready: ${kb.ledger.length} figures, ${kb.insights.length} insights${missed > 0 ? `. ${missed} of ${sheets.length} sheets couldn't be read` : ""}.`
      )
    return kb
  } catch (e) {
    usePilotStore.getState().updateTask(taskId, {
      status: "error",
      label: `BLACKBOX failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 60),
    })
    setIngest({ phase: "error", error: e instanceof Error ? e.message : String(e) })
    usePilotStore
      .getState()
      .setNotice(`Couldn't read ${meta.company}. Try re-uploading the file.`)
    return null
  }
}

/** Split long document text into paragraph-aligned chunks (capped count). */
function chunkText(text: string, maxChars = 12_000, maxChunks = 40): string[] {
  const paras = text.split(/\n\s*\n/)
  const chunks: string[] = []
  let cur = ""
  for (const p of paras) {
    if (cur.length + p.length + 2 > maxChars && cur) {
      chunks.push(cur)
      cur = ""
      if (chunks.length >= maxChunks) break
    }
    cur += (cur ? "\n\n" : "") + p
  }
  if (cur && chunks.length < maxChunks) chunks.push(cur)
  return chunks
}

/**
 * Ingest a text document (.docx / .doc / large .txt/.md) into the SAME grounded
 * knowledge base. We pull the text (Word via mammoth), chunk it, and transcribe
 * each chunk with extractDocChunk — capturing figures AND key statements — then
 * the audit, consolidate, analyse and critique stages are identical. So a Word
 * board pack or brief gets the full BLACKBOX treatment, not a raw text dump.
 */
export async function ingestTextDocument(
  file: File,
  meta: IngestMeta
): Promise<KnowledgeBase | null> {
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
  const ingestId = store.startIngest({ fileName: file.name, company: meta.company })
  const setLabel = (label: string) =>
    usePilotStore.getState().updateTask(taskId, { label: label.slice(0, 60) })
  const setIngest = (patch: Parameters<typeof store.updateIngest>[1]) =>
    usePilotStore.getState().updateIngest(ingestId, patch)

  try {
    setLabel(`BLACKBOX · opening ${meta.company}`)
    let text = ""
    if (/\.docx?$/i.test(file.name)) {
      const mod = await import("mammoth/mammoth.browser.js")
      const mammoth = mod.default ?? mod
      const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
      text = value
    } else {
      text = await file.text()
    }
    if (!text.trim()) throw new Error("no readable text")
    const chunks = chunkText(text)
    if (chunks.length === 0) throw new Error("no readable text")
    setIngest({ phase: "reading", total: chunks.length })

    let done = 0
    const pages = (
      await pool(chunks, EXTRACT_CONCURRENCY, async (c, i) => {
        const page = await extractDocChunk(c, i + 1, VISION_MODEL)
        setLabel(`BLACKBOX · reading section ${++done}/${chunks.length}`)
        setIngest({ done })
        return page
      })
    ).filter((p): p is ExtractedPage => Boolean(p))
    if (pages.length === 0) throw new Error("could not read the document")
    const missed = chunks.length - pages.length

    setLabel("BLACKBOX · auditing the numbers")
    setIngest({ phase: "auditing" })
    const rec = reconcile(pages)
    setLabel("BLACKBOX · consolidating")
    const consolidated = consolidate(pages)
    const validation = validateLedger(consolidated.ledger)
    consolidated.ledger = validation.ledger
    setLabel("BLACKBOX · analysing")
    setIngest({ phase: "analysing" })
    const final = await analyseBestEffort(consolidated, apiKey, setLabel)

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
      flags: [...rec.flags, ...validation.flags, ...coverageFlag(missed, chunks.length, "sections")],
      builtAt: Date.now(),
    }
    saveKnowledgeBase(kb)
    void syncKnowledge() // share the result to Peter's other devices (no-op if off)

    usePilotStore.getState().updateTask(taskId, {
      status: "done",
      label: `BLACKBOX · ${meta.company} ready (${kb.ledger.length} figures)`,
    })
    setIngest({ phase: "ready", figures: kb.ledger.length, missed, readyAt: Date.now() })
    usePilotStore
      .getState()
      .setNotice(
        `${meta.company} is analysed and ready: ${kb.insights.length} insights, ${kb.ledger.length} figures${missed > 0 ? `. ${missed} of ${chunks.length} sections couldn't be read` : ""}.`
      )
    return kb
  } catch (e) {
    usePilotStore.getState().updateTask(taskId, {
      status: "error",
      label: `BLACKBOX failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 60),
    })
    setIngest({ phase: "error", error: e instanceof Error ? e.message : String(e) })
    usePilotStore
      .getState()
      .setNotice(`Couldn't read ${meta.company}. Try re-uploading the file.`)
    return null
  }
}
