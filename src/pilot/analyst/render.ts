"use client"

/**
 * BLACKBOX Stage 0 — render. Turns each PDF page into a high-res PNG data URL in
 * the webview via pdf.js, so the vision model reads the page as Peter sees it
 * (tables + chart images intact). Works in `npm run dev` and the Tauri webview.
 */

import type { PDFDocumentProxy } from "pdfjs-dist"

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      // Bundled worker — no external CDN (CSP/offline safe in the static export).
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString()
      return pdfjs
    })
  }
  return pdfjsPromise
}

/**
 * Render every page of a PDF to a PNG data URL. `scale` ~2 (≈150–200 dpi) is
 * enough for the small table text in trade packs while keeping payloads sane.
 * Calls `onPage` after each page so callers can show progress.
 */
export async function renderPdfToPages(
  file: File | ArrayBuffer,
  opts: { scale?: number; onPage?: (done: number, total: number) => void } = {}
): Promise<string[]> {
  const scale = opts.scale ?? 2
  const pdfjs = await getPdfjs()
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const pdf: PDFDocumentProxy = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  const out: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no 2d canvas context")
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    out.push(canvas.toDataURL("image/png"))
    page.cleanup()
    opts.onPage?.(i, pdf.numPages)
  }
  return out
}

export async function pdfPageCount(file: File | ArrayBuffer): Promise<number> {
  const pdfjs = await getPdfjs()
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  return pdf.numPages
}
