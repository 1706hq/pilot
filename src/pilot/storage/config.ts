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
  watchlist: process.env.NEXT_PUBLIC_PILOT_WATCHLIST,
  syncUrl: process.env.NEXT_PUBLIC_PILOT_SYNC_URL,
  syncToken: process.env.NEXT_PUBLIC_PILOT_SYNC_TOKEN,
}

/**
 * Strip the junk that copy-paste from email/chat tacks onto a key: normal
 * whitespace, zero-width chars (U+200B–200D), BOM (U+FEFF), non-breaking space
 * (U+00A0), and surrounding straight/smart quotes or backticks. `trim()` alone
 * misses the invisible ones, which silently breaks an otherwise-correct key.
 */
export function sanitizeKey(v: string): string {
  // Regex LITERALS so \s is whitespace (not the letter "s"). Strips whitespace,
  // zero-width chars, BOM, nbsp, and surrounding quotes from a pasted key.
  return v
    .replace(/^[\s​-‍﻿ "'`‘’“”]+/, "")
    .replace(/[\s​-‍﻿ "'`‘’“”]+$/, "")
}

/** Drop undefined/empty values so they don't clobber real ones in a merge. */
function clean(obj: Partial<PilotConfig>): Partial<PilotConfig> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && sanitizeKey(v)) out[k] = sanitizeKey(v)
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

export interface KeyTest {
  ok: boolean
  message: string
}

/**
 * Live-check an OpenRouter key by hitting the authenticated /key endpoint.
 * Same host the chat path uses, so a pass means chat will work.
 */
export async function testOpenRouterKey(key: string): Promise<KeyTest> {
  const k = sanitizeKey(key)
  if (!k) return { ok: false, message: "No key entered" }
  if (!k.startsWith("sk-or-"))
    return {
      ok: false,
      message: `Doesn't look like an OpenRouter key (should start with sk-or-; it starts with ${JSON.stringify(key.slice(0, 8))})`,
    }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${k}` },
    })
    if (res.ok) return { ok: true, message: "Valid — chat is ready" }
    if (res.status === 401) return { ok: false, message: "Key rejected by OpenRouter (wrong or expired)" }
    return { ok: false, message: `OpenRouter error ${res.status}` }
  } catch {
    return { ok: false, message: "Couldn't reach OpenRouter (check internet)" }
  }
}

/**
 * Live-check the ElevenLabs key + agent id by minting a conversation token —
 * exactly what voice does on connect, so a pass means voice will work (once mic
 * is allowed).
 */
export async function testElevenLabs(key: string, agentId: string): Promise<KeyTest> {
  const k = sanitizeKey(key)
  const id = sanitizeKey(agentId)
  if (!k) return { ok: false, message: "No key entered" }
  if (!k.startsWith("sk_"))
    return {
      ok: false,
      message: `Doesn't look like an ElevenLabs key (should start with sk_; it starts with ${JSON.stringify(key.slice(0, 8))})`,
    }
  if (!id) return { ok: false, message: "Agent ID is empty" }
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(id)}`,
      { headers: { "xi-api-key": k } }
    )
    if (res.ok) return { ok: true, message: "Valid — voice is ready" }
    if (res.status === 401) return { ok: false, message: "Key rejected by ElevenLabs (wrong or expired)" }
    if (res.status === 404 || res.status === 422)
      return { ok: false, message: "Agent ID not found on this account" }
    // Surface ElevenLabs' actual reason (e.g. a 400) instead of a bare code.
    let reason = ""
    try {
      const body = (await res.json()) as { detail?: string | { message?: string; status?: string } }
      const d = body?.detail
      reason = (typeof d === "string" ? d : d?.message || d?.status) || ""
    } catch {
      /* ignore */
    }
    return { ok: false, message: `ElevenLabs error ${res.status}${reason ? ` — ${reason}` : ""}` }
  } catch {
    return { ok: false, message: "Couldn't reach ElevenLabs (check internet)" }
  }
}
