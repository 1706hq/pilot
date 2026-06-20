"use client"

/**
 * VIX — the Cboe Volatility Index, surfaced as ambient "flying conditions" in
 * the HUD. Display-only and a deliberate nod to Peter's love of derivatives:
 * the VIX is built from S&P 500 options, so it's the most derivative-native
 * number there is. This is NOT the future FALCON markets agent.
 *
 * Source: Twelve Data (free tier, symbol "VIX"). Chosen because it's
 * CORS-enabled, so the same plain `fetch` works in BOTH the browser dev server
 * and the native Tauri webview — no Tauri HTTP plugin needed. The key follows
 * the existing NEXT_PUBLIC_* pattern (see `storage/config.ts`).
 *
 * Returns null on any failure, or when no key is configured — the HUD then
 * quietly hides the line. Never throws, never surfaces an error to Peter.
 */

import { glowVisual } from "~/pilot/state/visuals"

export interface VixQuote {
  value: number
  prevClose: number
  /** Whether the market is open (live quote) vs showing the last close. */
  isOpen: boolean
}

const KEY = process.env.NEXT_PUBLIC_TWELVEDATA_KEY

export async function fetchVix(): Promise<VixQuote | null> {
  if (!KEY) return null
  try {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=VIX&apikey=${KEY}`
    )
    if (!res.ok) return null
    const j = (await res.json()) as {
      close?: string
      previous_close?: string
      is_market_open?: boolean
    }
    const value = Number(j.close)
    const prevClose = Number(j.previous_close)
    if (!Number.isFinite(value) || !Number.isFinite(prevClose)) return null
    return { value, prevClose, isOpen: j.is_market_open === true }
  } catch {
    return null
  }
}

export interface VixCondition {
  label: string
  /** HSL triple "h s l" (same shape as visuals.ts glowColor) for tinting. */
  glow: string
}

/**
 * Standard VIX regimes mapped to flying conditions. The two calm bands borrow
 * the orb/glow palette directly (idle blue, thinking amber); the rougher bands
 * extend it in the same saturation/lightness register.
 */
export function vixCondition(value: number): VixCondition {
  if (value < 15) return { label: "Clear skies", glow: glowVisual("idle").glowColor }
  if (value < 25) return { label: "Light chop", glow: glowVisual("thinking").glowColor }
  if (value < 35) return { label: "Turbulence", glow: "24 90 56" }
  return { label: "Storm", glow: "2 82 58" }
}
