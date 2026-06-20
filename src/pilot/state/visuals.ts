/**
 * Maps the abstract `pilotState` to concrete Orb + BorderGlow props. This is
 * the single place that defines how each state looks and moves, so the visual
 * language stays consistent and is easy to tune.
 *
 * Orb note: only `hue`, `hoverIntensity`, `forceHoverState` and `spinSpeed` are
 * animated at runtime — they are read live (and lerped) inside the shader's rAF
 * loop, so changing them never tears down the WebGL context.
 */

import type { PilotState } from "~/pilot/types"

/** Constant orb backdrop — matches the app background; never animated. */
export const ORB_BG = "#03060d"

export interface OrbVisual {
  /** Hue rotation in degrees applied to the orb's base palette. */
  hue: number
  hoverIntensity: number
  forceHoverState: boolean
  /** Continuous rotation speed in rad/s, independent of hover. */
  spinSpeed: number
}

export interface GlowVisual {
  /** HSL triple string consumed by BorderGlow, e.g. "210 80 60". */
  glowColor: string
  glowIntensity: number
  /** Three-stop colour ramp for the animated sweep. */
  colors: [string, string, string]
}

const ORB: Record<PilotState, OrbVisual> = {
  idle: { hue: 0, hoverIntensity: 0.3, forceHoverState: false, spinSpeed: 0.04 },
  connecting: { hue: 250, hoverIntensity: 0.45, forceHoverState: true, spinSpeed: 0.5 },
  listening: { hue: 120, hoverIntensity: 0.65, forceHoverState: true, spinSpeed: 0.18 },
  thinking: { hue: 190, hoverIntensity: 0.8, forceHoverState: true, spinSpeed: 0.7 },
  speaking: { hue: 28, hoverIntensity: 0.95, forceHoverState: true, spinSpeed: 0.28 },
}

const GLOW: Record<PilotState, GlowVisual> = {
  idle: {
    glowColor: "210 80 60",
    glowIntensity: 0.5,
    colors: ["#b0d3ff", "#528ef5", "#266feb"],
  },
  connecting: {
    glowColor: "265 85 66",
    glowIntensity: 0.75,
    colors: ["#d6c2ff", "#a07bff", "#7b4dff"],
  },
  listening: {
    glowColor: "150 80 58",
    glowIntensity: 1,
    colors: ["#b6ffe4", "#4fe0b0", "#1fc98a"],
  },
  thinking: {
    glowColor: "40 92 60",
    glowIntensity: 1,
    colors: ["#ffe6b0", "#ffb648", "#ff8c1f"],
  },
  speaking: {
    glowColor: "208 92 64",
    glowIntensity: 1,
    colors: ["#bfe0ff", "#4f9bff", "#1f7bff"],
  },
}

export function orbVisual(state: PilotState): OrbVisual {
  return ORB[state]
}

export function glowVisual(state: PilotState): GlowVisual {
  return GLOW[state]
}
