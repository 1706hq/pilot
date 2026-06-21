"use client"

/**
 * CoreOrb — the glowing "reactor core" at the centre of the cockpit: a bright
 * filled disc, a soft bloom, and two crisp concentric rings. Pure SVG + CSS (no
 * WebGL), so it's light and crisp. It recolours and changes its pulse per
 * `pilotState`, and sits inside the <Radar/> rings for the full Jarvis sonar
 * look. Decorative — pointer events pass through to the button that wraps it.
 */

import { usePilotStore } from "~/pilot/state/store"
import { glowVisual } from "~/pilot/state/visuals"
import type { PilotState } from "~/pilot/types"
import { cn } from "~/lib/utils"

/** Turn a "210 80 60" HSL triple into an `hsl()` colour with the given alpha. */
function hsla(triple: string, alpha: number): string {
  const [h, s, l] = triple.split(" ")
  return `hsl(${h} ${s}% ${l}% / ${alpha})`
}

/** Pulse cadence per state — calm at rest, urgent while thinking/connecting. */
const PULSE: Record<PilotState, string> = {
  idle: "4.8s",
  connecting: "1.7s",
  listening: "2.6s",
  thinking: "1.3s",
  speaking: "1.9s",
}

export function CoreOrb({ className }: { className?: string }) {
  const pilotState = usePilotStore((s) => s.pilotState)
  const { glowColor, colors } = glowVisual(pilotState)
  const duration = PULSE[pilotState]

  const ring = hsla(glowColor, 0.55)
  const ringFaint = hsla(glowColor, 0.22)
  const bloom = hsla(glowColor, 0.55)

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none relative grid size-full place-items-center", className)}
    >
      {/* Soft bloom that breathes — the orb's "presence". */}
      <div
        className="core-bloom absolute left-1/2 top-1/2 aspect-square w-[135%]"
        style={{
          background: `radial-gradient(circle, ${bloom} 0%, ${hsla(glowColor, 0.18)} 38%, transparent 70%)`,
          animationDuration: duration,
        }}
      />

      {/* Two crisp concentric rings around the core. */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none">
        <circle cx="50" cy="50" r="44" stroke={ringFaint} strokeWidth="0.8" />
        <circle cx="50" cy="50" r="33" stroke={ring} strokeWidth="1.1" />
      </svg>

      {/* The bright filled core. */}
      <div
        className="core-pulse aspect-square w-[38%] rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 40%, #eaf3ff 0%, ${colors[0]} 22%, ${colors[1]} 55%, ${colors[2]} 100%)`,
          boxShadow: `0 0 28px 2px ${hsla(glowColor, 0.7)}, 0 0 64px 6px ${hsla(glowColor, 0.4)}, inset 0 0 12px ${hsla(glowColor, 0.5)}`,
          animationDuration: duration,
        }}
      />
    </div>
  )
}
