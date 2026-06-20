"use client"

/**
 * Radar — a slow aviation sweep layered BEHIND the Orb. Concentric rings,
 * crosshairs, tick marks and a rotating sweep wedge reinforce that PILOT is
 * "flying and watching everything." Purely decorative: no pointer events, and
 * it never touches the Orb shader. The palette tracks `pilotState` via the
 * shared visuals map, so the rings tint with whatever PILOT is doing.
 *
 * Cheap by design — SVG strokes plus one transform-rotated conic gradient.
 */

import { usePilotStore } from "~/pilot/state/store"
import { glowVisual } from "~/pilot/state/visuals"
import { cn } from "~/lib/utils"

/** Turn a "210 80 60" HSL triple into an `hsl()` colour with the given alpha. */
function hsla(triple: string, alpha: number): string {
  const [h, s, l] = triple.split(" ")
  return `hsl(${h} ${s}% ${l}% / ${alpha})`
}

export function Radar({ className }: { className?: string }) {
  const pilotState = usePilotStore((s) => s.pilotState)
  const { glowColor } = glowVisual(pilotState)

  const ring = hsla(glowColor, 0.18)
  const ringFaint = hsla(glowColor, 0.1)
  // Blue rings, gold sweep when resting — the "watching" look Peter preferred.
  // While active, the sweep tracks PILOT's state colour so it reads as alive.
  const sweep = pilotState === "idle" ? hsla("42 95 62", 0.42) : hsla(glowColor, 0.34)

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      style={{ transition: "opacity 900ms ease" }}
    >
      <div className="relative size-full">
        {/* Rings, crosshair and tick marks. */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 size-full"
          fill="none"
        >
          <circle cx="100" cy="100" r="97" stroke={ringFaint} strokeWidth="0.6" />
          <circle
            cx="100"
            cy="100"
            r="88"
            stroke={ring}
            strokeWidth="0.8"
            strokeDasharray="1 5"
          />
          <circle cx="100" cy="100" r="64" stroke={ring} strokeWidth="0.6" />
          <circle cx="100" cy="100" r="38" stroke={ringFaint} strokeWidth="0.6" />
          {/* Crosshair. */}
          <line x1="100" y1="6" x2="100" y2="194" stroke={ringFaint} strokeWidth="0.5" />
          <line x1="6" y1="100" x2="194" y2="100" stroke={ringFaint} strokeWidth="0.5" />
        </svg>

        {/* Rotating sweep — a conic wedge confined to an outer annulus so it
            reads as a radar beam, not a fill. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${sweep} 34deg, transparent 64deg)`,
            WebkitMaskImage:
              "radial-gradient(circle, transparent 18%, #000 44%, #000 92%, transparent 96%)",
            maskImage:
              "radial-gradient(circle, transparent 18%, #000 44%, #000 92%, transparent 96%)",
            animation: "radar-sweep 7s linear infinite",
          }}
        />
      </div>
    </div>
  )
}
