"use client"

/**
 * Cockpit HUD chrome that frames the central stage:
 *  - Wordmark        — the P.I.L.O.T product mark above the orb (baseline dots).
 *  - TelemetryTicker — a thin "alive" status strip (clock + ambient tickers).
 *  - CornerBrackets  — faint Iron-Man framing in the stage corners.
 *
 * All three are decorative (pointer-events-none) and never touch the orb.
 */

import { useEffect, useState } from "react"

import { cn } from "~/lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/**
 * The P.I.L.O.T wordmark. The full stops are real period glyphs aligned on the
 * baseline (so they sit at the foot of the letters, not floating mid-cap), with
 * the expansion dimmed underneath.
 */
export function Wordmark({ className }: { className?: string }) {
  const letters = ["P", "I", "L", "O", "T"]
  return (
    <div className={cn("pointer-events-none select-none text-center", className)}>
      <div className="flex items-baseline justify-center font-semibold uppercase leading-none text-white/85 [text-shadow:0_0_20px_rgba(120,170,255,0.35)]">
        {letters.map((ch, i) => (
          <span key={ch} className="flex items-baseline">
            <span className="text-[22px] tracking-[0.05em]">{ch}</span>
            {i < letters.length - 1 ? (
              <span aria-hidden className="mx-[2.5px] text-[22px] leading-none text-white/40">
                .
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <div className="mt-[7px] text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-300/90 [text-shadow:0_0_12px_rgba(252,211,77,0.45)]">
        Peter&apos;s Intelligent Life Operating Terminal
      </div>
    </div>
  )
}

function Ticker({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir: "up" | "down" | "flat"
}) {
  const color =
    dir === "up"
      ? "text-emerald-300/70"
      : dir === "down"
        ? "text-rose-300/70"
        : "text-sky-300/60"
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : ""
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-white/30">{label}</span>
      <span className={cn("tabular-nums", color)}>
        {value}
        {arrow ? ` ${arrow}` : ""}
      </span>
    </span>
  )
}

/**
 * Thin telemetry strip near the top — a live clock plus a few ambient market /
 * portfolio readouts. Sells "PILOT is awake and watching." The clock is real;
 * the tickers are ambient HUD flavour, not live data.
 */
export function TelemetryTicker({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "--:--"
  const date = now ? `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}` : ""

  return (
    <div
      className={cn(
        "pointer-events-none flex select-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/35",
        className
      )}
    >
      {/* Left — systems status + clock. Hidden before it would crowd the
          centred wordmark on narrower windows. */}
      <div className="hidden items-center gap-2.5 min-[1120px]:flex">
        <span className="flex items-center gap-1.5">
          <span className="hud-breathe size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          <span className="text-emerald-300/65">All systems green</span>
        </span>
        <span className="text-white/15">·</span>
        <span className="text-white/40">{date}</span>
        <span className="tabular-nums text-white/55">{time}</span>
      </div>
      {/* Right — ambient market / portfolio readouts. Hidden a touch earlier
          than the left cluster (it sits slightly closer to the wordmark). */}
      <div className="ml-auto hidden items-center gap-3.5 min-[1200px]:flex">
        <Ticker label="FTSE" value="8,214" dir="up" />
        <Ticker label="GBP/USD" value="1.271" dir="up" />
        <Ticker label="Portfolio" value="●" dir="flat" />
      </div>
    </div>
  )
}

/** Faint, slowly-breathing brackets in the four corners of the central stage. */
export function CornerBrackets({ className }: { className?: string }) {
  const corners = [
    { pos: "left-0 top-0 border-l border-t rounded-tl", delay: "0s" },
    { pos: "right-0 top-0 border-r border-t rounded-tr", delay: "1.5s" },
    { pos: "bottom-0 left-0 border-b border-l rounded-bl", delay: "3s" },
    { pos: "bottom-0 right-0 border-b border-r rounded-br", delay: "4.5s" },
  ]
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-3", className)}>
      {corners.map((c) => (
        <span
          key={c.pos}
          className={cn("hud-breathe absolute size-5 border-sky-300/40", c.pos)}
          style={{ animationDelay: c.delay }}
        />
      ))}
    </div>
  )
}
