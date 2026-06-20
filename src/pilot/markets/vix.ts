"use client"

/**
 * VIX — the Cboe Volatility Index, surfaced as ambient "flying conditions" in
 * the HUD. Display-only and a deliberate nod to Peter's love of derivatives:
 * the VIX is built from S&P 500 options, so it's the most derivative-native
 * number there is. This is NOT the future FALCON markets agent.
 *
 * Source (keyless by default): Yahoo Finance's VIX chart endpoint, reached via
 * a lightweight public CORS proxy so the same `fetch` works in BOTH the browser
 * dev server and the native Tauri webview (Yahoo itself sends no CORS headers).
 * We only ever send a public Yahoo URL through the proxy — no keys, no user
 * data. If NEXT_PUBLIC_TWELVEDATA_KEY is set it's used directly instead (no
 * proxy). Either way: returns null on any failure — the HUD then quietly hides
 * the line. Never throws, never surfaces an error to Peter.
 */

import { glowVisual } from "~/pilot/state/visuals"

export interface VixQuote {
  value: number
  prevClose: number
  /** Whether the market is open (live quote) vs showing the last close. */
  isOpen: boolean
}

const TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVEDATA_KEY

/** Optional, direct provider — used only when a key is configured. */
async function fromTwelveData(): Promise<VixQuote | null> {
  if (!TWELVE_DATA_KEY) return null
  try {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=VIX&apikey=${TWELVE_DATA_KEY}`
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

/** Keyless default — Yahoo's VIX chart via a CORS proxy. */
async function fromYahoo(): Promise<VixQuote | null> {
  try {
    const yahoo = "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX"
    const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(yahoo)}`)
    if (!res.ok) return null
    const j = (await res.json()) as {
      chart?: {
        result?: {
          meta?: {
            regularMarketPrice?: number
            chartPreviousClose?: number
            marketState?: string
          }
        }[]
      }
    }
    const m = j?.chart?.result?.[0]?.meta
    const value = Number(m?.regularMarketPrice)
    const prevClose = Number(m?.chartPreviousClose)
    if (!Number.isFinite(value) || !Number.isFinite(prevClose)) return null
    const state = m?.marketState
    // Only claim "closed" when we actually know it; never guess wrong.
    return { value, prevClose, isOpen: typeof state === "string" ? state === "REGULAR" : true }
  } catch {
    return null
  }
}

export async function fetchVix(): Promise<VixQuote | null> {
  return (await fromTwelveData()) ?? (await fromYahoo())
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
