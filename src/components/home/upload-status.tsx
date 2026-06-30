"use client"

/**
 * Upload status — the prominent, reassuring feedback for a file being analysed.
 * Peter uploads a report and immediately sees it landed, watches it work through
 * the stages with a rough time estimate, and gets a clear "ready" the moment he
 * can ask about it. Reads the live `ingests` from the store.
 */

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { usePilotStore } from "~/pilot/state/store"
import { cn } from "~/lib/utils"
import type { Ingest } from "~/pilot/types"

const READY_LINGER_MS = 12_000
const ANALYSIS_ALLOWANCE_MS = 25_000

function statusLine(ing: Ingest): string {
  switch (ing.phase) {
    case "uploading":
      return "Uploaded. Getting started…"
    case "reading":
      return ing.total > 0
        ? `Reading the figures… ${ing.done}/${ing.total}`
        : "Reading the figures…"
    case "auditing":
      return "Checking the numbers…"
    case "analysing":
      return "Pulling out the insights…"
    case "ready":
      return ing.missed && ing.missed > 0
        ? `Ready. ${ing.figures ?? 0} figures pulled, but ${ing.missed} part${ing.missed > 1 ? "s" : ""} couldn't be read. Ask me about ${ing.company}.`
        : `Ready. ${ing.figures ?? 0} figures pulled. Ask me anything about ${ing.company}.`
    case "error":
      return "Couldn't read this one. Try uploading it again."
  }
}

function progressPct(ing: Ingest): number {
  switch (ing.phase) {
    case "uploading":
      return 6
    case "reading":
      return ing.total > 0 ? 8 + (ing.done / ing.total) * 68 : 14
    case "auditing":
      return 80
    case "analysing":
      return 90
    case "ready":
    case "error":
      return 100
  }
}

function etaText(ing: Ingest, now: number): string {
  if (ing.phase === "ready" || ing.phase === "error") return ""
  if (ing.phase === "auditing" || ing.phase === "analysing") return "almost ready"
  let remainMs: number
  if (ing.phase === "reading" && ing.done > 0 && ing.total > 0) {
    const perItem = (now - ing.startedAt) / ing.done
    remainMs = (ing.total - ing.done) * perItem + ANALYSIS_ALLOWANCE_MS
  } else if (ing.total > 0) {
    remainMs = (ing.total / 4) * 3500 + ANALYSIS_ALLOWANCE_MS
  } else {
    return "estimating time…"
  }
  const s = Math.max(5, Math.round(remainMs / 1000))
  if (s <= 20) return "almost ready"
  if (s < 80) return "about a minute left"
  const m = Math.round(s / 60)
  return `about ${m} minute${m > 1 ? "s" : ""} left`
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-white/25 border-t-white/80",
        className
      )}
    />
  )
}

function Card({ ing, onDismiss }: { ing: Ingest; onDismiss: () => void }) {
  // Auto-dismiss a finished card after it's been seen.
  useEffect(() => {
    if (ing.phase === "ready") {
      const t = setTimeout(onDismiss, READY_LINGER_MS)
      return () => clearTimeout(t)
    }
  }, [ing.phase, onDismiss])

  const now = Date.now()
  const pct = progressPct(ing)
  const eta = etaText(ing, now)
  const done = ing.phase === "ready"
  const failed = ing.phase === "error"
  const barColor = done ? "bg-emerald-400" : failed ? "bg-rose-400" : "bg-sky-400"
  const glow = done
    ? "shadow-[0_0_24px_rgba(52,211,153,0.18)]"
    : failed
      ? "shadow-[0_0_24px_rgba(251,113,133,0.16)]"
      : "shadow-[0_0_24px_rgba(56,151,255,0.14)]"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "pointer-events-auto rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl",
        glow
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-5 shrink-0 place-items-center">
          {done ? (
            <svg className="size-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
          ) : failed ? (
            <svg className="size-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.3 2.5 18a1.7 1.7 0 0 0 1.5 2.5h16a1.7 1.7 0 0 0 1.5-2.5L13.7 4.3a1.7 1.7 0 0 0-3 0Z" />
            </svg>
          ) : (
            <Spinner />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90">
          {ing.fileName}
        </span>
        {(done || failed) && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-white/35 transition hover:text-white/80"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      <p className="mt-1.5 pl-7.5 text-[12px] leading-snug text-white/55">
        {statusLine(ing)}
      </p>

      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {!done && !failed && eta ? (
        <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/35">
          <span>Analysing</span>
          <span className="tabular-nums">{eta}</span>
        </div>
      ) : null}
    </motion.div>
  )
}

export function UploadStatus() {
  const ingests = usePilotStore((s) => s.ingests)
  const removeIngest = usePilotStore((s) => s.removeIngest)
  // Tick so live ETA + progress refresh each second while something's processing.
  const [, setTick] = useState(0)
  const active = ingests.some((i) => i.phase !== "ready" && i.phase !== "error")
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [active])

  if (ingests.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[150px] z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-5 md:right-5 md:w-[340px]">
      <AnimatePresence initial={false}>
        {ingests.map((ing) => (
          <Card key={ing.id} ing={ing} onDismiss={() => removeIngest(ing.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
