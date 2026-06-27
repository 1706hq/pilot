"use client"

/**
 * Cross-device sync for analysed data — so Peter uploads once and sees the same
 * picture on his Mac and his phone. It moves only the SMALL analysed result (the
 * knowledge base JSON), never the raw files, to a single private store behind a
 * token. Analysis still happens on-device; this just shares the output.
 *
 * Protocol (endpoint-agnostic): GET the store URL returns the saved payload,
 * PUT writes it. Tolerates a bare array, {knowledge:[...]}, or {result:"<json>"}
 * (so it works with a tiny custom function or an Upstash-style REST KV). When no
 * sync store is configured it's a silent no-op — the app works exactly as before.
 *
 * See context/sync-endpoint.md for the ~15-line store to deploy.
 */

import { localKnowledgeBases, saveKnowledgeBase } from "~/pilot/analyst/store"
import { usePilotStore } from "~/pilot/state/store"
import type { KnowledgeBase } from "~/pilot/analyst/types"

interface SyncPayload {
  knowledge: KnowledgeBase[]
  updatedAt: number
}

function syncConfig(): { url?: string; token?: string } {
  const { config } = usePilotStore.getState()
  return { url: config.syncUrl, token: config.syncToken }
}

export function syncEnabled(): boolean {
  const { url, token } = syncConfig()
  return Boolean(url && token)
}

/** Pull the saved knowledge bases from the store (null on failure / not set). */
async function fetchRemote(): Promise<KnowledgeBase[] | null> {
  const { url, token } = syncConfig()
  if (!url || !token) return null
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return res.status === 404 ? [] : null
    const data: unknown = await res.json().catch(() => null)
    return normalize(data)
  } catch {
    return null
  }
}

/** Coax the response into a KnowledgeBase[] across the supported shapes. */
function normalize(data: unknown): KnowledgeBase[] {
  if (!data) return []
  if (Array.isArray(data)) return data as KnowledgeBase[]
  if (typeof data === "object") {
    const o = data as Record<string, unknown>
    if (Array.isArray(o.knowledge)) return o.knowledge as KnowledgeBase[]
    if (typeof o.result === "string") {
      try {
        const inner = JSON.parse(o.result) as unknown
        return normalize(inner)
      } catch {
        return []
      }
    }
  }
  return []
}

async function putRemote(knowledge: KnowledgeBase[]): Promise<boolean> {
  const { url, token } = syncConfig()
  if (!url || !token) return false
  const payload: SyncPayload = { knowledge, updatedAt: Date.now() }
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Merge the store's analysed docs into this device (newest per docId wins). */
export async function pullKnowledge(): Promise<number> {
  const remote = await fetchRemote()
  if (!remote) return 0
  const localById = new Map(localKnowledgeBases().map((k) => [k.docId, k]))
  let merged = 0
  for (const kb of remote) {
    if (!kb?.docId) continue
    const have = localById.get(kb.docId)
    if (!have || (kb.builtAt ?? 0) > (have.builtAt ?? 0)) {
      saveKnowledgeBase(kb)
      merged += 1
    }
  }
  if (merged > 0) usePilotStore.getState().setNotice(`Synced ${merged} document(s) from your other device.`)
  return merged
}

let inFlight = false

/**
 * Full sync: pull the store in (newest wins), then push the device's merged set
 * back up so neither device clobbers the other. Safe to call on boot and after
 * each analysis; a no-op when no store is configured, and never overlaps itself.
 */
export async function syncKnowledge(): Promise<void> {
  if (!syncEnabled() || inFlight) return
  inFlight = true
  try {
    await pullKnowledge()
    await putRemote(localKnowledgeBases())
  } finally {
    inFlight = false
  }
}
