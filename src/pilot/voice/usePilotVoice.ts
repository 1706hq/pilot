"use client"

/**
 * Voice loop — wraps the ElevenLabs Conversational AI session (provider-based
 * SDK) and exposes a simple start/stop/toggle. The agent's status + speaking
 * state drive `pilotState` (so the Orb reacts), and its client tools are wired
 * to the same store actions as the text path: show_on_canvas paints dashboards,
 * crew_working lights a task, live_search reads a line aloud.
 *
 * Must be used inside a <ConversationProvider> (see VoiceProvider).
 */

import { useCallback, useEffect, useRef } from "react"
import {
  useConversationClientTool,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react"

import { paintCanvas, quickLine } from "~/pilot/agents/canvas"
import { knowledgeSummary, retrieveContext } from "~/pilot/analyst/store"
import { getContextText } from "~/pilot/storage/context"
import { pickVoiceGreeting } from "~/pilot/voice/greetings"
import { voiceBridge } from "~/pilot/voice/voiceBridge"
import { usePilotStore } from "~/pilot/state/store"
import type { AgentId } from "~/pilot/types"

/**
 * Map a spoken crew name onto the roster (the full eight-agent CREW). Legacy
 * CAPITAL/CONTROL/etc. are still tolerated so an older tool call doesn't fall
 * through to PILOT.
 */
function mapCrew(name: string): { agent: AgentId; label: string } {
  const key = name.trim().toUpperCase()
  if (key === "STERLING" || key === "CAPITAL")
    return { agent: "STERLING", label: "Sterling" }
  if (key === "MARSHALL" || key === "CONTROL" || key === "COURSE" || key === "CREW CHIEF")
    return { agent: "MARSHALL", label: "Marshall" }
  if (key === "SPARK") return { agent: "SPARK", label: "Spark" }
  if (key === "SHIELD") return { agent: "SHIELD", label: "Shield" }
  if (key === "SCOUT") return { agent: "SCOUT", label: "Scout" }
  if (key === "PEGASUS") return { agent: "PEGASUS", label: "Pegasus" }
  if (key === "HERCULES") return { agent: "HERCULES", label: "Hercules" }
  if (key === "FALCON") return { agent: "FALCON", label: "Falcon" }
  return { agent: "PILOT", label: "PILOT" }
}

/** Pull a human-readable reason out of an ElevenLabs error response. */
async function elevenLabsError(res: Response): Promise<string> {
  try {
    const body = (await res.clone().json()) as {
      detail?: string | { message?: string; status?: string }
    }
    const d = body?.detail
    const reason = typeof d === "string" ? d : d?.message || d?.status
    if (reason) return reason
  } catch {
    try {
      const t = (await res.text()).trim()
      if (t) return t.slice(0, 200)
    } catch {
      /* ignore */
    }
  }
  return ""
}

async function fetchConversationToken(agentId: string, apiKey: string) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey } }
  )
  if (!res.ok) {
    const reason = await elevenLabsError(res)
    throw new Error(`token request failed: ${res.status}${reason ? ` — ${reason}` : ""}`)
  }
  const data = (await res.json()) as { token: string }
  return data.token
}

export function usePilotVoice() {
  const setPilotState = usePilotStore((s) => s.setPilotState)
  const config = usePilotStore((s) => s.config)

  const controls = useConversationControls()
  const { status } = useConversationStatus()
  const { isSpeaking } = useConversationMode()

  // Client tools — names must match the agent's tool config.
  useConversationClientTool("show_on_canvas", async (p) =>
    paintCanvas(String((p as { intent?: string })?.intent ?? ""))
  )
  useConversationClientTool("live_search", async (p) =>
    quickLine(String((p as { query?: string })?.query ?? ""))
  )
  useConversationClientTool("crew_working", async (p) => {
    const { agent, label } = mapCrew(String((p as { agent?: string })?.agent ?? ""))
    const store = usePilotStore.getState()
    const id = store.addTask({ label: `${label} on it`, agent, status: "working" })
    setTimeout(() => usePilotStore.getState().updateTask(id, { status: "done" }), 4000)
    return "lit"
  })
  // Read the CURRENT uploaded context on demand — always fresh, so files added
  // mid-session are picked up without restarting the conversation.
  useConversationClientTool("read_context", async () => {
    const files = usePilotStore.getState().contextFiles
    // BLACKBOX-analysed documents (incl. the pre-loaded packs) — always available.
    const kb = knowledgeSummary(6000)
    const parts: string[] = []
    if (kb) parts.push(`Analysed documents (grounded, page-cited):\n${kb}`)
    if (files.length > 0) {
      const names = files.map((f) => f.name).join(", ")
      const text = getContextText(6000)
      parts.push(
        text
          ? `Files Peter has uploaded (${files.length}): ${names}\n\n${text}`
          : `Peter has uploaded ${files.length} file(s): ${names} (not text-readable here).`
      )
    }
    if (parts.length === 0) return "Peter hasn't uploaded any files yet."
    return parts.join("\n\n")
  })
  // Query Peter's analysed documents (BLACKBOX) for a SPECIFIC question — the
  // same per-query retrieval the text chat uses, so voice has identical access
  // to the full ledger (every figure page-cited), not just the static summary.
  useConversationClientTool("query_data", async (p) => {
    const question = String((p as { question?: string })?.question ?? "")
    const facts = retrieveContext(question || "summary")
    return facts || "No analysed documents cover that yet."
  })
  // Clear the Runway (right-hand canvas) — all cards/dashboards/invoices/files.
  useConversationClientTool("clear_canvas", async () => {
    usePilotStore.getState().clearWidgets()
    return "Cleared the Runway."
  })

  // Connection timing — measured, not guessed. Logged on every session so a
  // "voice is slow" report can be diagnosed from the console: was it the token,
  // the WebRTC handshake, or time-to-first-word (agent/TTS side)?
  const connectT0 = useRef<number | null>(null)
  const loggedConnect = useRef(false)

  // Drive the Orb from the conversation state.
  useEffect(() => {
    if (status === "connecting") setPilotState("connecting")
    else if (status === "connected") {
      if (connectT0.current !== null) {
        const ms = Math.round(performance.now() - connectT0.current)
        if (!loggedConnect.current) {
          loggedConnect.current = true
          // eslint-disable-next-line no-console
          console.info(`[pilot-voice] connected in ${ms}ms`)
        }
        if (isSpeaking) {
          // eslint-disable-next-line no-console
          console.info(`[pilot-voice] first word at ${ms}ms`)
          connectT0.current = null
        }
      }
      setPilotState(isSpeaking ? "speaking" : "listening")
    } else setPilotState("idle")
  }, [status, isSpeaking, setPilotState])

  // Keep the bridge populated so context uploads can push into a live session.
  useEffect(() => {
    voiceBridge.active = status === "connected"
    voiceBridge.sendContextualUpdate = (text: string) => {
      try {
        controls.sendContextualUpdate(text)
      } catch {
        /* not connected */
      }
    }
  }, [status, controls])

  const start = useCallback(async () => {
    const store = usePilotStore.getState()
    store.setVoiceError(null)
    if (!config.elevenLabsAgentId || !config.elevenLabsKey) {
      store.setVoiceError("Voice isn't configured (missing ElevenLabs key or agent id).")
      return
    }
    // Mic access must succeed before we bother with the session.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      store.setVoiceError(
        "Microphone blocked. Allow mic access for this site (address-bar icon) and try again."
      )
      return
    }
    setPilotState("connecting")
    connectT0.current = performance.now()
    loggedConnect.current = false
    try {
      const token = await fetchConversationToken(
        config.elevenLabsAgentId,
        config.elevenLabsKey
      )
      // eslint-disable-next-line no-console
      console.info(`[pilot-voice] token in ${Math.round(performance.now() - connectT0.current)}ms`)
      // Inject a fresh, witty opener each session via the {{greeting}} dynamic
      // variable, plus what PILOT already knows: BLACKBOX-analysed documents
      // (the pre-loaded packs) first, then any files Peter has uploaded.
      const kb = knowledgeSummary(3500)
      const files = getContextText(3000)
      const context =
        [kb, files].filter(Boolean).join("\n\n") || "(no documents analysed yet)"
      controls.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        dynamicVariables: {
          greeting: pickVoiceGreeting(),
          context,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // eslint-disable-next-line no-console
      console.error("[pilot-voice] start failed", err)
      usePilotStore.getState().setVoiceError(`Couldn't connect: ${msg}`)
      setPilotState("idle")
    }
  }, [config.elevenLabsAgentId, config.elevenLabsKey, controls, setPilotState])

  const stop = useCallback(() => {
    controls.endSession()
    setPilotState("idle")
  }, [controls, setPilotState])

  const active = status === "connected" || status === "connecting"

  const toggle = useCallback(() => {
    if (active) stop()
    else void start()
  }, [active, start, stop])

  return { status, isSpeaking, active, start, stop, toggle }
}
