"use client"

/**
 * Staged launch reveal. Returns a phase that climbs 0 → 3 over the first few
 * seconds so the UI can fade in in order: aurora background (1), then the orb
 * "ring" (2), then everything else (3). Plays the choral pad once per load.
 *
 * Phase 0 = black. Runs only once per page load (HMR re-mounts jump to 3).
 */

import { useEffect, useState } from "react"

import { playLaunchPad } from "./launchSound"

let launched = false

export function useLaunch() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (launched) {
      setPhase(3)
      return
    }
    launched = true
    playLaunchPad()
    const timers = [
      setTimeout(() => setPhase(1), 150), // aurora in
      setTimeout(() => setPhase(2), 1500), // orb in
      setTimeout(() => setPhase(3), 2700), // everything else
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return phase
}
