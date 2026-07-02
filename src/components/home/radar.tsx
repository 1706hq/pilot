"use client"

/**
 * Radar — the cockpit "sonar" instrument layered behind the CoreOrb: concentric
 * rings (some full, some broken into arcs / half-rings), a tick-mark ring, a
 * dashed ring, a dotted ring, a crosshair, and a slow gold sweep. The palette
 * tracks `pilotState`; the sweep is gold while resting, like a radar trail.
 *
 * CREW blips: live tasks appear ON the instrument as pings in the owning
 * agent's colour — STERLING reading a pack is a teal contact, FALCON sweeping
 * markets a gold one. Theatre that is also a status display: the radar shows
 * who's actually working. Position is a stable hash of the task id, so a blip
 * doesn't wander between renders.
 *
 * Cheap by design — SVG strokes plus one transform-rotated conic gradient.
 */

import { AGENTS } from "~/pilot/agents/agents"
import { usePilotStore } from "~/pilot/state/store"
import { glowVisual } from "~/pilot/state/visuals"
import { cn } from "~/lib/utils"

/** Turn a "210 80 60" HSL triple into an `hsl()` colour with the given alpha. */
function hsla(triple: string, alpha: number): string {
  const [h, s, l] = triple.split(" ")
  return `hsl(${h} ${s}% ${l}% / ${alpha})`
}

/** Polar → cartesian (degrees, 0° = up/12 o'clock), centred on 100,100. */
function pol(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]
}

/** SVG path for an arc of radius r from startDeg to endDeg (clockwise). */
function arc(r: number, start: number, end: number): string {
  const [x1, y1] = pol(r, start)
  const [x2, y2] = pol(r, end)
  const large = (end - start + 360) % 360 > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/** Small stable hash so each task keeps its spot on the scope. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** A CREW contact on the scope — working tasks ping, fresh finishes glow. */
function Blip({ id, agent, working }: { id: string; agent: keyof typeof AGENTS; working: boolean }) {
  const accent = AGENTS[agent].accent
  const h = hash(id)
  const deg = h % 360
  const radius = 34 + (h % 52) // between the dotted ring and the tick gauge
  const [x, y] = pol(radius, deg)
  return (
    <div
      className="absolute"
      style={{ left: `${x / 2}%`, top: `${y / 2}%`, transform: "translate(-50%, -50%)" }}
    >
      {working ? (
        <span
          className="absolute inset-0 -m-1 animate-ping rounded-full"
          style={{ backgroundColor: `${accent}55` }}
        />
      ) : null}
      <span
        className="relative block size-[5px] rounded-full"
        style={{
          backgroundColor: accent,
          boxShadow: `0 0 8px ${accent}cc`,
          opacity: working ? 1 : 0.55,
        }}
      />
    </div>
  )
}

export function Radar({ className }: { className?: string }) {
  const pilotState = usePilotStore((s) => s.pilotState)
  const tasks = usePilotStore((s) => s.tasks)
  const { glowColor } = glowVisual(pilotState)

  // CREW contacts: everything working now, plus the freshest recent finishes
  // (capped so the scope reads as an instrument, not confetti).
  const working = tasks.filter((t) => t.status === "working").slice(-4)
  const recent = tasks
    .filter((t) => t.status === "done" && Date.now() - t.startedAt < 120_000)
    .slice(-3)
  const blips = [...working, ...recent]

  const ring = hsla(glowColor, 0.5)
  const faint = hsla(glowColor, 0.26)
  const dim = hsla(glowColor, 0.14)
  const sweep = pilotState === "idle" ? "42 95 62" : glowColor

  // Tick-mark ring — a degree gauge; every 6th tick is longer.
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      style={{ transition: "opacity 900ms ease" }}
    >
      <div className="relative size-full">
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 size-full"
          fill="none"
          strokeLinecap="round"
        >
          {/* Crosshair through the centre. */}
          <line x1="100" y1="8" x2="100" y2="192" stroke={dim} strokeWidth="0.35" />
          <line x1="8" y1="100" x2="192" y2="100" stroke={dim} strokeWidth="0.35" />

          {/* Outer ring with a small gap at the top. */}
          <path d={arc(96, 7, 353)} stroke={faint} strokeWidth="0.6" />
          {/* A short accent arc sitting just outside, top-left (sweep origin). */}
          <path d={arc(98, 300, 350)} stroke={ring} strokeWidth="1" />

          {/* Tick-mark gauge ring. */}
          {ticks.map((d) => {
            const long = d % 30 === 0
            const [x1, y1] = pol(long ? 84 : 88, d)
            const [x2, y2] = pol(92, d)
            return (
              <line
                key={d}
                x1={x1.toFixed(2)}
                y1={y1.toFixed(2)}
                x2={x2.toFixed(2)}
                y2={y2.toFixed(2)}
                stroke={long ? ring : faint}
                strokeWidth={long ? 0.6 : 0.45}
              />
            )
          })}

          {/* Long-dashed ring. */}
          <circle cx="100" cy="100" r="78" stroke={faint} strokeWidth="0.8" strokeDasharray="7 6" />

          {/* Broken concentric arcs — the "half rings". */}
          <path d={arc(64, -42, 116)} stroke={ring} strokeWidth="0.9" />
          <path d={arc(52, 126, 256)} stroke={faint} strokeWidth="0.9" />
          <path d={arc(44, 14, 84)} stroke={ring} strokeWidth="0.75" />
          <path d={arc(38, 188, 300)} stroke={faint} strokeWidth="0.7" />

          {/* Fine dotted ring nearer the core. */}
          <circle
            cx="100"
            cy="100"
            r="28"
            stroke={faint}
            strokeWidth="0.9"
            strokeDasharray="0.4 5"
          />
        </svg>

        {/* Rotating gold sweep — a thick comet-trail confined to an annulus. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${hsla(sweep, 0)} 6deg, ${hsla(sweep, 0.9)} 74deg, transparent 82deg)`,
            WebkitMaskImage:
              "radial-gradient(circle, transparent 44%, #000 50%, #000 70%, transparent 75%)",
            maskImage:
              "radial-gradient(circle, transparent 44%, #000 50%, #000 70%, transparent 75%)",
            animation: "radar-sweep 8s linear infinite",
          }}
        />

        {/* CREW contacts — agent-coloured pings for live work. */}
        {blips.map((t) => (
          <Blip key={t.id} id={t.id} agent={t.agent} working={t.status === "working"} />
        ))}
      </div>
    </div>
  )
}
