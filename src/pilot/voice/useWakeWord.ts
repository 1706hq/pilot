"use client"

/**
 * Always-on "Hey PILOT" wake word via the browser Web Speech API.
 *
 * NOTE: browser-only stopgap — webkitSpeechRecognition is reliable in Chrome but
 * NOT in the macOS WKWebView the packaged Tauri app uses. Before the desktop
 * build we swap this engine for an on-device WASM one (sherpa-onnx / Picovoice)
 * behind the same { status } interface.
 *
 * It arms itself on mount and keeps itself alive (auto-restart on end/error). It
 * pauses while a voice session is active so it doesn't fight ElevenLabs for the
 * mic, then resumes when the session ends. On match it calls onWake.
 */

import { useEffect, useRef, useState } from "react"

export type WakeStatus = "starting" | "listening" | "unsupported" | "denied"

// Accept "hey pilot" and common mishearings; also bare "pilot" as a fallback.
const WAKE_RES = [
  /\bhey[, ]+(pilot|pilots|pilate|pilates|pylot|pile it|pirate)\b/,
  /\b(hi|hey|a|ok|okay|hello)[, ]+pilot\b/,
  /\bhey[, ]+pi\b/,
]

type SpeechRecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function matches(text: string): boolean {
  return WAKE_RES.some((re) => re.test(text))
}

export function useWakeWord(onWake: () => void, { paused }: { paused: boolean }) {
  const [status, setStatus] = useState<WakeStatus>("starting")

  const recogRef = useRef<SpeechRecognitionLike | null>(null)
  const pausedRef = useRef(paused)
  const onWakeRef = useRef(onWake)
  const cooldownRef = useRef(false)
  const deadRef = useRef(false) // permanently stopped (permission denied)
  const startRef = useRef<() => void>(() => {})

  onWakeRef.current = onWake
  pausedRef.current = paused

  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setStatus("unsupported")
      return
    }

    const start = () => {
      if (deadRef.current || pausedRef.current || recogRef.current) return
      const recog = new Ctor()
      recog.continuous = true
      recog.interimResults = true
      recog.lang = "en-US"

      recog.onresult = (e) => {
        let transcript = ""
        for (let i = 0; i < e.results.length; i++) {
          transcript += (e.results[i][0]?.transcript ?? "") + " "
        }
        const norm = transcript.toLowerCase().replace(/[^a-z, ]/g, " ").replace(/\s+/g, " ").trim()
        // eslint-disable-next-line no-console
        console.debug("[wake] heard:", norm)
        if (!cooldownRef.current && matches(norm)) {
          cooldownRef.current = true
          setTimeout(() => (cooldownRef.current = false), 3000)
          // eslint-disable-next-line no-console
          console.info("[wake] 'Hey PILOT' detected")
          onWakeRef.current()
        }
      }
      recog.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          deadRef.current = true
          setStatus("denied")
        }
        // other errors (no-speech, network, aborted) fall through to onend -> restart
      }
      recog.onend = () => {
        recogRef.current = null
        if (!deadRef.current && !pausedRef.current) {
          // Brief delay avoids a tight restart loop on repeated immediate ends.
          setTimeout(() => start(), 400)
        }
      }

      try {
        recog.start()
        recogRef.current = recog
        setStatus("listening")
      } catch {
        recogRef.current = null
        // Likely needs a user gesture — retry on next interaction (wired below).
        setTimeout(() => start(), 600)
      }
    }
    startRef.current = start

    // Try immediately; also retry on the first user gesture (some browsers
    // require a gesture before granting the mic).
    start()
    const onGesture = () => {
      deadRef.current = false
      start()
    }
    window.addEventListener("pointerdown", onGesture, { once: false })

    return () => {
      window.removeEventListener("pointerdown", onGesture)
      const recog = recogRef.current
      recogRef.current = null
      if (recog) {
        recog.onend = null
        try {
          recog.abort()
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pause/resume around active voice sessions.
  useEffect(() => {
    if (paused) {
      const recog = recogRef.current
      recogRef.current = null
      if (recog) {
        recog.onend = null
        try {
          recog.abort()
        } catch {
          /* ignore */
        }
      }
    } else if (!deadRef.current) {
      startRef.current()
    }
  }, [paused])

  return { status, supported: getCtor() !== null }
}
