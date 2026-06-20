"use client"

/**
 * Market Conditions — a single, ambient HUD line that translates the VIX into
 * "flying conditions" (clear skies → storm), themed to PILOT's aviation
 * metaphor. Display-only cockpit telemetry, not a widget. Refreshes every 60s,
 * caches the last good value, and renders nothing when there's no data — never
 * an error state.
 */

import { useEffect, useState } from "react"

import { cn } from "~/lib/utils"
import { fetchVix, vixCondition, type VixQuote } from "~/pilot/markets/vix"

/** Poll the VIX every 60s; keep the last good value across transient failures. */
function useVix(): VixQuote | null {
  const [quote, setQuote] = useState<VixQuote | null>(null)
  useEffect(() => {
    let alive = true
    const load = () => {
      void fetchVix().then((q) => {
        if (alive && q) setQuote(q)
      })
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return quote
}

/** "210 80 60" → "hsl(210 80% 60% / a)". */
function hsl(triple: string, alpha = 1): string {
  const [h, s, l] = triple.split(" ")
  return `hsl(${h} ${s}% ${l}% / ${alpha})`
}

export function MarketConditions({ className }: { className?: string }) {
  const quote = useVix()
  if (!quote) return null // no key / never loaded → hide the line entirely

  const { value, prevClose, isOpen } = quote
  const cond = vixCondition(value)
  const up = value >= prevClose
  const changePct = prevClose ? Math.abs((value - prevClose) / prevClose) * 100 : 0

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex select-none items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-white/35",
        className
      )}
    >
      <span className="text-white/30">Market conditions</span>
      <span className="text-white/15">·</span>
      <span className="tabular-nums text-white/60">VIX {value.toFixed(1)}</span>
      <span className="tabular-nums text-white/45">{up ? "▲" : "▼"}</span>
      <span className="tabular-nums text-white/25">{changePct.toFixed(1)}%</span>
      <span style={{ color: hsl(cond.glow, 0.9) }}>{cond.label}</span>
      {!isOpen ? <span className="text-white/25">(closed)</span> : null}
    </div>
  )
}
