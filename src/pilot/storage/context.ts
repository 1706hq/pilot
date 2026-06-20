"use client"

/**
 * Context files Peter uploads via "Add context". Stored in localStorage, which
 * persists in BOTH the browser and the Tauri (macOS) webview — so uploads
 * survive across every future conversation without needing disk/native APIs.
 *
 * Text-based files have their content stored (and fed into PILOT's system
 * prompt); binary files (PDF/images) keep metadata only so PILOT at least knows
 * they exist. The store mirrors lightweight metadata for the UI.
 */

import { usePilotStore } from "~/pilot/state/store"
import { voiceBridge } from "~/pilot/voice/voiceBridge"
import type { ContextFileMeta } from "~/pilot/types"

const KEY = "pilot.context.v1"
/** Per-file text cap and total budget fed to the model, to stay within limits. */
const PER_FILE_CHARS = 60_000
const PROMPT_BUDGET = 16_000

interface StoredFile {
  name: string
  type: string
  size: number
  addedAt: number
  /** Extracted text, or "" for binary files. */
  text: string
}

function readAll(): StoredFile[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredFile[]) : []
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

function isImage(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name)
}

function isTextLike(file: File): boolean {
  return file.type.startsWith("text/") || TEXT_EXT.test(file.name)
}

/**
 * Add uploaded files to context. Images are rejected. Text-based files are
 * stored as text (already markdown-friendly, token-efficient); other binaries
 * keep metadata only so PILOT knows they exist. Returns how many were skipped.
 */
export async function addContextFiles(
  fileList: FileList | File[]
): Promise<{ added: number; skippedImages: number }> {
  const incoming = Array.from(fileList)
  const existing = readAll()
  const byName = new Map(existing.map((f) => [f.name, f]))
  let added = 0
  let skippedImages = 0

  for (const file of incoming) {
    if (isImage(file)) {
      skippedImages += 1
      continue
    }
    let text = ""
    if (isTextLike(file)) {
      try {
        text = (await file.text()).slice(0, PER_FILE_CHARS)
      } catch {
        text = ""
      }
    }
    byName.set(file.name, {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      addedAt: Date.now(),
      text,
    })
    added += 1
  }

  const merged = Array.from(byName.values())
  writeAll(merged)
  syncStore(merged)

  // If a voice session is live, push the new context straight into it so PILOT
  // knows immediately — no need to wait for him to call read_context.
  if (added > 0 && voiceBridge.active) {
    const names = incoming
      .filter((f) => !isImage(f))
      .map((f) => f.name)
      .join(", ")
    const text = getContextText(6000)
    voiceBridge.sendContextualUpdate(
      `Peter has just uploaded files to your context: ${names}. You can now reference them. Current readable contents:\n${text || "(no extractable text — likely a PDF or binary)"}`
    )
  }

  return { added, skippedImages }
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
 * Concatenated context text for PILOT's system prompt (text files only,
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
