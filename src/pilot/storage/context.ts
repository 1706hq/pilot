"use client"

/**
 * Context files Peter uploads via "Add context". Stored in localStorage, which
 * persists in BOTH the browser and the Tauri (macOS) webview — so uploads
 * survive across every future conversation without needing disk/native APIs.
 *
 * Text-based files have their content stored directly; PDF / Word / Excel files
 * are text-EXTRACTED client-side (so PILOT can actually read Peter's financials,
 * not just know a file exists). Anything we can't read keeps metadata only and
 * is honestly flagged "name only". The store mirrors lightweight metadata for
 * the UI, including each file's read status.
 *
 * The heavy extractors (unpdf / mammoth / xlsx) are DYNAMICALLY imported inside
 * the extractor so they stay out of the main bundle and never run at module
 * load — the same constraint react-pdf has in this static-export build.
 */

import { usePilotStore } from "~/pilot/state/store"
import { voiceBridge } from "~/pilot/voice/voiceBridge"
import type { ContextFileMeta, ContextFileStatus } from "~/pilot/types"

const KEY = "pilot.context.v1"
/** Per-file text cap and total budget fed to the model, to stay within limits. */
const PER_FILE_CHARS = 60_000
const PROMPT_BUDGET = 16_000
/** Upload ceiling. Reports well under this; bigger gets a clear, friendly reject. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_FILE_LABEL = "25MB"
/** Human-readable list of what PILOT can fully analyse, for the upload hint. */
export const SUPPORTED_HINT = `PDF, Excel or Word, up to ${MAX_FILE_LABEL}`

interface StoredFile {
  name: string
  type: string
  size: number
  addedAt: number
  /** Extracted/read text, or "" when not readable. */
  text: string
  /** How the text was obtained — drives the honest UI status. */
  status: ContextFileStatus
}

/** Result of trying to ingest one file, returned to the UI for confirmation. */
export interface AddedFile {
  name: string
  /** "image"/"toolarge" = rejected; "error" = failed; "analysing" = queued for BLACKBOX; otherwise the read status. */
  outcome: ContextFileStatus | "image" | "error" | "analysing" | "toolarge"
}

function readAll(): StoredFile[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    // Tolerate files persisted before `status` existed.
    return (JSON.parse(raw) as StoredFile[]).map((f) => ({
      ...f,
      status: f.status ?? (f.text ? "text" : "binary"),
    }))
  } catch {
    return []
  }
}

function writeAll(files: StoredFile[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(files))
  } catch {
    // Quota exceeded — drop oldest until it fits.
    const trimmed = files.slice()
    while (trimmed.length > 1) {
      trimmed.shift()
      try {
        window.localStorage.setItem(KEY, JSON.stringify(trimmed))
        return
      } catch {
        /* keep trimming */
      }
    }
  }
}

function toMeta(f: StoredFile): ContextFileMeta {
  return {
    name: f.name,
    path: KEY,
    size: f.size,
    addedAt: f.addedAt,
    snippet: f.text ? f.text.slice(0, 140) : undefined,
    status: f.status,
    hasText: Boolean(f.text),
  }
}

function syncStore(files: StoredFile[]) {
  usePilotStore.getState().setContextFiles(files.map(toMeta))
}

/** Load persisted context into the store (call once on boot). */
export function initContext() {
  syncStore(readAll())
}

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|ya?ml|html?|xml|log|rtf|ts|tsx|js|jsx|py|css|sql)$/i
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|heic|heif|avif|tiff?|ico)$/i
const PDF_EXT = /\.pdf$/i
const DOCX_EXT = /\.docx$/i
const SHEET_EXT = /\.(xlsx|xls|xlsm)$/i
/** Tabular data that should be ANALYSED (BLACKBOX), not dumped as raw text. */
const SPREADSHEET_EXT = /\.(xlsx|xls|xlsm|csv|tsv)$/i

function isImage(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name)
}

function isSpreadsheet(file: File): boolean {
  return SPREADSHEET_EXT.test(file.name) || file.type.includes("spreadsheet")
}

function isTextLike(file: File): boolean {
  return file.type.startsWith("text/") || TEXT_EXT.test(file.name)
}

function isPdf(file: File): boolean {
  return PDF_EXT.test(file.name) || file.type === "application/pdf"
}

function isExtractable(file: File): boolean {
  return DOCX_EXT.test(file.name) || SHEET_EXT.test(file.name)
}

/** Best-effort company label from a filename, for the knowledge base. */
function deriveCompany(name: string): string {
  const stem = name.replace(/\.[a-z0-9]+$/i, "")
  if (/\bAGT\b|american golf/i.test(stem)) return "American Golf"
  return stem
}

/**
 * Pull plain text out of a PDF / .docx / .xlsx so PILOT can read the actual
 * numbers. Each extractor is dynamically imported. Returns "" if there's no
 * readable text (e.g. a scanned, image-only PDF) — callers treat that as
 * "name only" rather than pretending the file was read.
 */
async function extractText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()

  if (PDF_EXT.test(file.name) || file.type === "application/pdf") {
    const { getDocumentProxy, extractText: pdfExtract } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const { text } = await pdfExtract(pdf, { mergePages: true })
    return Array.isArray(text) ? text.join("\n") : text
  }

  if (DOCX_EXT.test(file.name)) {
    const mod = await import("mammoth/mammoth.browser.js")
    const mammoth = mod.default ?? mod
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
    return value
  }

  if (SHEET_EXT.test(file.name)) {
    const XLSX = await import("xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    return wb.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
      return csv.trim() ? `## Sheet: ${name}\n${csv}` : ""
    })
      .filter(Boolean)
      .join("\n\n")
  }

  return ""
}

/**
 * Add uploaded files to context. Images are rejected. Text files are stored
 * directly; PDF/Word/Excel are text-extracted so PILOT can read them; anything
 * else (or a failed/empty extraction) keeps metadata only and is flagged "name
 * only". Returns a per-file breakdown so the UI can confirm exactly what landed.
 */
export async function addContextFiles(
  fileList: FileList | File[]
): Promise<{ added: number; skippedImages: number; files: AddedFile[] }> {
  const incoming = Array.from(fileList)
  const existing = readAll()
  const byName = new Map(existing.map((f) => [f.name, f]))
  const files: AddedFile[] = []
  const pdfQueue: File[] = []
  const sheetQueue: File[] = []
  const docQueue: File[] = []
  let added = 0
  let skippedImages = 0

  for (const file of incoming) {
    if (file.size > MAX_FILE_BYTES) {
      files.push({ name: file.name, outcome: "toolarge" })
      continue
    }
    if (isImage(file)) {
      skippedImages += 1
      files.push({ name: file.name, outcome: "image" })
      continue
    }

    let text = ""
    let status: ContextFileStatus = "binary"
    let outcome: AddedFile["outcome"] = "binary"

    if (isPdf(file)) {
      // PDFs go through BLACKBOX (vision, page-by-page, grounded) — NOT a naive
      // text dump. Stored name-only here; the grounded knowledge base is the
      // real source of truth at query time.
      pdfQueue.push(file)
      status = "extracted"
      outcome = "analysing"
    } else if (isSpreadsheet(file)) {
      // Spreadsheets ALSO go through BLACKBOX (parse each sheet, transcribe,
      // audit, analyse) so the numbers are grounded and accurate — not a raw,
      // truncated CSV dumped into the prompt. Name-only here; the KB is truth.
      sheetQueue.push(file)
      status = "extracted"
      outcome = "analysing"
    } else if (DOCX_EXT.test(file.name)) {
      // Word documents go through BLACKBOX too (text + tables, chunked, analysed)
      // so a board pack or brief is grounded, not a raw text dump.
      docQueue.push(file)
      status = "extracted"
      outcome = "analysing"
    } else if (isTextLike(file)) {
      try {
        text = (await file.text()).slice(0, PER_FILE_CHARS)
        status = "text"
        outcome = "text"
      } catch {
        text = ""
        status = "binary"
        outcome = "error"
      }
    } else if (isExtractable(file)) {
      try {
        text = (await extractText(file)).slice(0, PER_FILE_CHARS)
        if (text.trim()) {
          status = "extracted"
          outcome = "extracted"
        } else {
          // Readable container, but no text layer (e.g. a scanned PDF).
          status = "binary"
          outcome = "binary"
        }
      } catch {
        text = ""
        status = "binary"
        outcome = "error"
      }
    }

    byName.set(file.name, {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      addedAt: Date.now(),
      text,
      status,
    })
    added += 1
    files.push({ name: file.name, outcome })
  }

  const merged = Array.from(byName.values())
  writeAll(merged)
  syncStore(merged)

  // Kick off BLACKBOX for each PDF as a background job (render → extract → audit
  // → consolidate → analyse → store). Long-running; progress shows in the Tasks
  // feed. Dynamically imported so pdf.js only loads when a PDF is ingested.
  for (const pdf of pdfQueue) {
    void import("~/pilot/analyst/run").then(({ ingestDocument }) =>
      ingestDocument(pdf, {
        docId: pdf.name,
        company: deriveCompany(pdf.name),
        period: "",
      })
    )
  }

  // Spreadsheets run the same pipeline via a sheet-aware path.
  for (const sheet of sheetQueue) {
    void import("~/pilot/analyst/run").then(({ ingestSpreadsheet }) =>
      ingestSpreadsheet(sheet, {
        docId: sheet.name,
        company: deriveCompany(sheet.name),
        period: "",
      })
    )
  }

  // Word documents run the same pipeline via a text-aware path.
  for (const doc of docQueue) {
    void import("~/pilot/analyst/run").then(({ ingestTextDocument }) =>
      ingestTextDocument(doc, {
        docId: doc.name,
        company: deriveCompany(doc.name),
        period: "",
      })
    )
  }

  // If a voice session is live, push the new context straight into it so PILOT
  // knows immediately — no need to wait for him to call read_context.
  if (added > 0 && voiceBridge.active) {
    const names = files
      .filter((f) => f.outcome !== "image")
      .map((f) => f.name)
      .join(", ")
    const text = getContextText(6000)
    voiceBridge.sendContextualUpdate(
      `Peter has just uploaded files to your context: ${names}. You can now reference them. Current readable contents:\n${text || "(no extractable text — likely a scanned PDF or image)"}`
    )
  }

  return { added, skippedImages, files }
}

/** Turn an upload result into a short, specific confirmation line for the UI. */
export function describeUpload(r: {
  skippedImages: number
  files: AddedFile[]
}): string {
  const analysing = r.files.filter((f) => f.outcome === "analysing")
  const readable = r.files.filter(
    (f) => f.outcome === "text" || f.outcome === "extracted"
  )
  const nameOnly = r.files.filter(
    (f) => f.outcome === "binary" || f.outcome === "error"
  )
  const parts: string[] = []
  if (analysing.length) {
    parts.push(
      `Uploaded ${analysing.map((f) => f.name).join(", ")}. Reading and checking the numbers now (about a minute). I'll confirm the moment ${analysing.length > 1 ? "they're" : "it's"} ready.`
    )
  }
  if (readable.length) {
    parts.push(
      `Added ${readable.map((f) => f.name).join(", ")}. PILOT can read ${readable.length > 1 ? "them" : "it"} now.`
    )
  }
  if (nameOnly.length) {
    parts.push(
      `${nameOnly.map((f) => f.name).join(", ")} added by name only (couldn't read the text)`
    )
  }
  const tooLarge = r.files.filter((f) => f.outcome === "toolarge")
  if (tooLarge.length) {
    parts.push(
      `${tooLarge.map((f) => f.name).join(", ")} is over ${MAX_FILE_LABEL}, too big to analyse. Try a smaller export.`
    )
  }
  if (r.skippedImages) {
    parts.push(`skipped ${r.skippedImages} image${r.skippedImages > 1 ? "s" : ""}`)
  }
  return parts.join(" · ") || "Nothing added"
}

export function removeContextFile(name: string) {
  const next = readAll().filter((f) => f.name !== name)
  writeAll(next)
  syncStore(next)
}

export function clearContext() {
  writeAll([])
  syncStore([])
}

/**
 * Concatenated context text for PILOT's system prompt (readable files only,
 * truncated to a budget). Returns "" when there's nothing usable.
 */
export function getContextText(budget = PROMPT_BUDGET): string {
  const files = readAll().filter((f) => f.text)
  if (files.length === 0) return ""
  let out = ""
  for (const f of files) {
    const block = `\n### ${f.name}\n${f.text}\n`
    if (out.length + block.length > budget) {
      out += block.slice(0, Math.max(0, budget - out.length))
      break
    }
    out += block
  }
  return out.trim()
}
