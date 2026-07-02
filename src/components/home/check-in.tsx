"use client"

/**
 * The CREW CHECK-IN — the morning ritual overlay. Pre-flight roll call: the
 * eight agents report in for duty one by one (staggered, each in its accent),
 * a scan beam sweeps the roster, then PILOT lays out "NEEDS YOUR DECISION —
 * three, maximum". Every decision card is tappable and drops Peter straight
 * into the conversation with the exact question.
 *
 * All content is deterministic and pre-verified (see checkin.ts) so the
 * theatre is instant; FALCON's live market line streams in when it lands.
 */

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { AGENTS } from "~/pilot/agents/agents"
import { sendMessage } from "~/pilot/agents/orchestrator"
import {
  buildCheckIn,
  fetchMarketLine,
  markCheckinShown,
  type CheckIn,
} from "~/pilot/checkin/checkin"
import { usePilotStore } from "~/pilot/state/store"
import { cn } from "~/lib/utils"

const ROW_STAGGER = 0.14
const EASE = [0.16, 1, 0.3, 1] as const

function nowLabel(): string {
  const d = new Date()
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function ReportRow({
  agent,
  line,
  items,
  live,
  index,
}: {
  agent: keyof typeof AGENTS
  line: string
  items: number
  live: boolean
  index: number
}) {
  const meta = AGENTS[agent]
  return (
    <motion.div
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.5 + index * ROW_STAGGER, ease: EASE }}
      className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-0"
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-md text-[10.5px] font-semibold tracking-tight"
        style={{ color: meta.accent, backgroundColor: `${meta.accent}1c` }}
      >
        {meta.monogram}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em]" style={{ color: meta.accent }}>
            {meta.name}
          </span>
          <span className="truncate text-[9.5px] uppercase tracking-[0.12em] text-white/25">
            {meta.role}
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">{line}</p>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.72 + index * ROW_STAGGER, duration: 0.25 }}
        className={cn(
          "shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em]",
          items > 0 ? "text-amber-300/90" : live ? "text-emerald-300/80" : "text-white/30"
        )}
      >
        {items > 0 ? `${items} items` : live ? "✓ clear" : "standby"}
      </motion.span>
    </motion.div>
  )
}

export function CheckInOverlay() {
  const open = usePilotStore((s) => s.checkinOpen)
  const setOpen = usePilotStore((s) => s.setCheckinOpen)
  const [marketLine, setMarketLine] = useState<string | null>(null)
  const checkin: CheckIn | null = useMemo(() => (open ? buildCheckIn() : null), [open])

  // FALCON's live line is the single network touch — swap it in when it lands.
  useEffect(() => {
    if (!open) return
    setMarketLine(null)
    markCheckinShown()
    let alive = true
    void fetchMarketLine().then((line) => {
      if (alive && line) setMarketLine(line)
    })
    return () => {
      alive = false
    }
  }, [open])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  const decisionsDelay = 0.5 + 8 * ROW_STAGGER + 0.35

  return (
    <AnimatePresence>
      {open && checkin ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[300] overflow-y-auto bg-[#02040a]/88 backdrop-blur-xl"
          onClick={() => setOpen(false)}
        >
          {/* atmosphere: radial glow + faint grid */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(56,151,255,0.10), transparent 60%)",
            }}
          />
          <div
            className="relative mx-auto w-full max-w-[620px] px-6 pb-16 pt-[7vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex items-end justify-between"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-sky-300/70">
                  Crew check-in
                </div>
                <div className="mt-1.5 text-[22px] font-semibold leading-tight text-white">
                  {checkin.live
                    ? "All agents reporting for duty."
                    : "The CREW is assembled and waiting for data."}
                </div>
              </div>
              <div className="pb-1 text-right">
                <div className="font-mono text-[10px] tracking-[0.18em] text-white/35">{nowLabel()}</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30 transition hover:text-white/70"
                >
                  Skip ✕
                </button>
              </div>
            </motion.div>

            {/* scan line */}
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
              className="mt-4 h-px origin-left bg-gradient-to-r from-sky-400/60 via-sky-300/20 to-transparent"
            />

            {/* roll call */}
            <div className="mt-2">
              {checkin.reports.map((r, i) => (
                <ReportRow
                  key={r.agent}
                  agent={r.agent}
                  line={r.agent === "FALCON" && marketLine ? marketLine : r.line}
                  items={r.items}
                  live={r.agent === "FALCON" ? Boolean(marketLine) : r.live}
                  index={i}
                />
              ))}
            </div>

            {/* decisions */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: decisionsDelay, ease: EASE }}
              className="mt-8"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber-300/80">
                  Needs your decision
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-amber-300/25 to-transparent" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
                  three · maximum
                </span>
              </div>

              {checkin.decisions.length === 0 ? (
                <p className="mt-4 text-[13.5px] leading-relaxed text-white/50">
                  Nothing needs you yet. Upload a pack and the CREW gets to work.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                  {checkin.decisions.map((d, i) => {
                    const meta = AGENTS[d.agent]
                    return (
                      <motion.button
                        key={d.title}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: decisionsDelay + 0.15 + i * 0.12, ease: EASE }}
                        onClick={() => {
                          setOpen(false)
                          void sendMessage(d.prompt)
                        }}
                        className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-white/[0.14] hover:bg-white/[0.06]"
                      >
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[2.5px]"
                          style={{ backgroundColor: meta.accent }}
                        />
                        <div className="flex items-center justify-between gap-3 pl-2">
                          <span className="text-[14px] font-semibold leading-snug text-white/90">
                            {d.title}
                          </span>
                          <span
                            className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] opacity-0 transition group-hover:opacity-100"
                            style={{ color: meta.accent }}
                          >
                            open ↗
                          </span>
                        </div>
                        <p className="mt-1 pl-2 text-[12.5px] leading-snug text-white/50">{d.detail}</p>
                      </motion.button>
                    )
                  })}
                </div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: decisionsDelay + 0.6, duration: 0.6 }}
                className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-white/25"
              >
                Everything else is handled.
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
