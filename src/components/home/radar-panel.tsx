"use client"

/**
 * RADAR — PILOT's proactive intelligence on the home screen. It surfaces the
 * non-obvious things across Peter's analysed data: turbulence (risks), tailwinds
 * (opportunities) and signals (patterns worth a look), each grounded in real
 * figures and tappable to explore. Below it sit a few everyday exec starters.
 */

import { useEffect, useState } from "react"
import { motion } from "motion/react"

import { sendMessage } from "~/pilot/agents/orchestrator"
import {
  STARTERS,
  generateRadar,
  getRadar,
  radarIsStale,
  type RadarKind,
  type RadarReading,
} from "~/pilot/radar/radar"
import { usePilotStore } from "~/pilot/state/store"
import { cn } from "~/lib/utils"

const KIND: Record<
  RadarKind,
  { label: string; dot: string; text: string; ring: string }
> = {
  turbulence: {
    label: "Turbulence",
    dot: "bg-amber-400",
    text: "text-amber-300/90",
    ring: "group-hover:border-amber-400/30",
  },
  tailwind: {
    label: "Tailwind",
    dot: "bg-emerald-400",
    text: "text-emerald-300/90",
    ring: "group-hover:border-emerald-400/30",
  },
  signal: {
    label: "Signal",
    dot: "bg-sky-400",
    text: "text-sky-300/90",
    ring: "group-hover:border-sky-400/30",
  },
}

function ReadingCard({ r }: { r: RadarReading }) {
  const k = KIND[r.kind]
  return (
    <button
      type="button"
      onClick={() => sendMessage(r.prompt)}
      className={cn(
        "group w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left backdrop-blur-sm transition hover:bg-white/[0.06]",
        k.ring
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full", k.dot)} style={{ boxShadow: "0 0 8px currentColor" }} />
        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", k.text)}>
          {k.label}
        </span>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.1em] text-white/0 transition group-hover:text-white/40">
          Tap to explore
        </span>
      </div>
      <div className="mt-1.5 text-[14px] font-semibold leading-snug text-white/90">
        {r.headline}
      </div>
      {r.detail ? (
        <p className="mt-1 text-[12px] leading-relaxed text-white/50">{r.detail}</p>
      ) : null}
    </button>
  )
}

export function RadarPanel({ className }: { className?: string }) {
  const [readings, setReadings] = useState<RadarReading[]>(getRadar())
  const hasKey = usePilotStore((s) => Boolean(s.config.openRouterKey))

  // Refresh from the live data when it's changed (e.g. a new upload analysed).
  useEffect(() => {
    if (hasKey && radarIsStale()) {
      void generateRadar().then(setReadings)
    } else {
      setReadings(getRadar())
    }
  }, [hasKey])

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
          Radar
        </span>
        <span
          className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-px text-[9px] font-medium uppercase tracking-[0.14em] text-sky-300/80"
          title="What PILOT is picking up across your business, from the analysed data"
        >
          Picking up
        </span>
      </div>

      <div className="model-picker-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-1 pb-2">
        {readings.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
          >
            <ReadingCard r={r} />
          </motion.div>
        ))}

        {/* Everyday exec starters. */}
        <div className="mt-1 flex flex-wrap justify-center gap-1.5 px-1 pt-1">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => sendMessage(s.prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white/90"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
