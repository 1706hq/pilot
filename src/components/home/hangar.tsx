"use client"

/**
 * HANGAR — the document library. The honest single-source-of-truth view of
 * everything BLACKBOX holds: each document's company, coverage (figures /
 * insights / flags), any specialist verdict (PEGASUS pitch score, SHIELD
 * contract review), freshness, and whether it's bundled or Peter's own upload.
 * Pure view over stored data — no model calls. Tap a document to ask PILOT
 * about it; tap Upload to add more.
 */

import { useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"

import { sendMessage } from "~/pilot/agents/orchestrator"
import { listKnowledgeBases, localKnowledgeBases } from "~/pilot/analyst/store"
import { usePilotStore } from "~/pilot/state/store"

const EASE = [0.16, 1, 0.3, 1] as const

function age(builtAt: number): string {
  const days = Math.floor((Date.now() - builtAt) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function Count({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className={`font-mono text-[12px] tabular-nums ${warn && n > 0 ? "text-amber-300/90" : "text-white/75"}`}>
        {n}
      </span>
      <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/30">{label}</span>
    </span>
  )
}

export function HangarOverlay() {
  const open = usePilotStore((s) => s.hangarOpen)
  const setOpen = usePilotStore((s) => s.setHangarOpen)
  const kbs = useMemo(() => (open ? listKnowledgeBases() : []), [open])
  const localIds = useMemo(
    () => (open ? new Set(localKnowledgeBases().map((k) => k.docId)) : new Set<string>()),
    [open]
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[300] overflow-y-auto bg-[#02040a]/88 backdrop-blur-xl"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative mx-auto w-full max-w-[680px] px-6 pb-16 pt-[7vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="flex items-end justify-between"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-sky-300/70">
                  Hangar
                </div>
                <div className="mt-1.5 text-[22px] font-semibold leading-tight text-white">
                  {kbs.length === 0
                    ? "Empty. Everything you upload lands here."
                    : `${kbs.length} document${kbs.length === 1 ? "" : "s"} on board, fully analysed.`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30 transition hover:text-white/70"
              >
                Close ✕
              </button>
            </motion.div>

            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="mt-4 h-px origin-left bg-gradient-to-r from-sky-400/60 via-sky-300/20 to-transparent"
            />

            <div className="mt-2">
              {kbs.map((kb, i) => (
                <motion.button
                  key={kb.docId}
                  type="button"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: EASE }}
                  onClick={() => {
                    setOpen(false)
                    void sendMessage(
                      `From the document "${kb.docId}": give me the headline picture and anything that needs my attention.`
                    )
                  }}
                  className="group flex w-full items-center gap-3.5 border-b border-white/[0.05] py-3 text-left transition hover:bg-white/[0.02] last:border-0"
                >
                  {/* doc glyph */}
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sky-400/[0.08] text-sky-300/70">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                    </svg>
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[13px] font-medium text-white/85">{kb.docId}</span>
                      {kb.pitch ? (
                        <span className="shrink-0 rounded bg-[#7ef29b]/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#7ef29b]/90">
                          Pitch {kb.pitch.score}/5
                        </span>
                      ) : null}
                      {kb.contract ? (
                        <span className="shrink-0 rounded bg-[#a78bfa]/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#a78bfa]/90">
                          Contract
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/35">
                      <span>{kb.company}</span>
                      {kb.period ? <span className="text-white/20">· {kb.period}</span> : null}
                      <span className="text-white/20">· {age(kb.builtAt)}</span>
                      <span className="text-white/20">
                        · {localIds.has(kb.docId) ? "your upload" : "pre-loaded"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3.5">
                    <Count n={kb.ledger.length} label="figs" />
                    <Count n={kb.insights.length} label="insights" />
                    <Count n={kb.flags.length} label="flags" warn />
                  </div>
                  <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-sky-300/0 transition group-hover:text-sky-300/80">
                    Ask ↗
                  </span>
                </motion.button>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + kbs.length * 0.08, duration: 0.5 }}
              className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/25"
            >
              Flags are BLACKBOX&apos;s honesty trail — every figure it wasn&apos;t sure of.
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
