"use client"

/**
 * Runtime configuration. Keys are read from NEXT_PUBLIC_* env (.env.local,
 * gitignored) and seeded into the store on boot. Later phases can also persist
 * overrides to a local config file on device.
 */

import { usePilotStore } from "~/pilot/state/store"

export const OPENROUTER_MODEL =
  process.env.NEXT_PUBLIC_OPENROUTER_MODEL || "google/gemini-3.5-flash"

const ENV = {
  openRouterKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
  elevenLabsKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
  elevenLabsAgentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
  porcupineKey: process.env.NEXT_PUBLIC_PICOVOICE_KEY,
}

/** Seed the store config from env. Safe to call repeatedly. */
export function initConfigFromEnv() {
  const patch: Record<string, string> = {}
  for (const [k, v] of Object.entries(ENV)) {
    if (v) patch[k] = v
  }
  usePilotStore.getState().setConfig(patch)
}
