"use client"

/**
 * The central Orb, wired to `pilotState`. It reads the current state from the
 * store and feeds the matching visual props to the shader. Because the Orb
 * lerps hue / hoverIntensity / spin internally, switching state glides smoothly
 * with no WebGL teardown.
 */

import Orb from "~/components/orb/Orb"
import { usePilotStore } from "~/pilot/state/store"
import { ORB_BG, orbVisual } from "~/pilot/state/visuals"

export default function PilotOrb() {
  const pilotState = usePilotStore((s) => s.pilotState)
  const v = orbVisual(pilotState)

  return (
    <Orb
      animate
      backgroundColor={ORB_BG}
      hue={v.hue}
      hoverIntensity={v.hoverIntensity}
      forceHoverState={v.forceHoverState}
      spinSpeed={v.spinSpeed}
      rotateOnHover={false}
    />
  )
}
