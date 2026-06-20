"use client"

/**
 * Runtime configuration (API keys, model, agent id).
 *
 * Source of truth is **localStorage** (`pilot.config.v1`) — Peter pastes his
 * keys in the in-app Settings panel and they live on his device only; nothing is
 * baked into the shipped binary. For local development, NEXT_PUBLIC_* env vars
 * (.env.local, gitignored) still seed the store so `npm run dev` works without
 * pasting — but a saved value always wins over env.
 */

import { usePilotStore } from "~/pilot/state/store"
import type { PilotConfig } from "~/pilot/types"

const CONFIG_KEY = "pilot.config.v1"

export const DEFAULT_MODEL = "google/gemini-3.5-flash"
/** The app's pre-built ElevenLabs voice agent — prefilled so Peter only pastes keys. */
export const DEFAULT_AGENT_ID = "agent_5801kvdenajhens9ppvp0xvyd8yp"

const ENV: Partial<PilotConfig> = {
  openRouterKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
  elevenLabsKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
  elevenLabsAgentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
  porcupineKey: process.env.NEXT_PUBLIC_PICOVOICE_KEY,
  model: process.env.NEXT_PUBLIC_OPENROUTER_MODEL,
}

/** Drop undefined/empty values so they don't clobber real ones in a merge. */
function clean(obj: Partial<PilotConfig>): Partial<PilotConfig> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim()
  }
  return out as Partial<PilotConfig>
}

function loadPersisted(): Partial<PilotConfig> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)
    return raw ? clean(JSON.parse(raw) as Partial<PilotConfig>) : {}
  } catch {
    return {}
  }
}

/**
 * Seed the store on boot: env first (dev convenience), then persisted values on
 * top (user-saved keys win). Safe to call repeatedly.
 */
export function initConfig() {
  const merged = { ...clean(ENV), ...loadPersisted() }
  usePilotStore.getState().setConfig(merged)
}

/** Persist a config patch to localStorage AND the store (used by Settings). */
export function saveConfig(patch: Partial<PilotConfig>) {
  const next = { ...loadPersisted(), ...clean(patch) }
  // Allow clearing a field by passing "" explicitly.
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "string" && !v.trim()) delete (next as Record<string, string>)[k]
  }
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  usePilotStore.getState().setConfig(next)
}

/** The configured OpenRouter model, or the app default. */
export function getModel(): string {
  return usePilotStore.getState().config.model || DEFAULT_MODEL
}

/** True once the minimum needed to talk to PILOT (an OpenRouter key) is set. */
export function isConfigured(): boolean {
  return Boolean(usePilotStore.getState().config.openRouterKey)
}
