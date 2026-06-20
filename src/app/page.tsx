"use client"

import { useEffect, useRef, useState } from "react"
import { ConversationProvider } from "@elevenlabs/react"

import BorderGlow from "~/components/BorderGlow"
import DarkVeil from "~/components/dark-veil"
import { AgentsSidebar } from "~/components/home/agents-sidebar"
import { OutputSidebar } from "~/components/home/output-sidebar"
import { ReferenceComposer } from "~/components/home/reference-composer"
import { Transcript } from "~/components/home/transcript"
import { cn } from "~/lib/utils"
import { sendMessage } from "~/pilot/agents/orchestrator"
import { usePilotVoice } from "~/pilot/voice/usePilotVoice"
import { useWakeWord } from "~/pilot/voice/useWakeWord"
import PilotOrb from "~/pilot/state/PilotOrb"
import { usePilotStore } from "~/pilot/state/store"
import { glowVisual } from "~/pilot/state/visuals"
import { initConfigFromEnv } from "~/pilot/storage/config"
import { initContext } from "~/pilot/storage/context"
import { pickGreeting } from "~/pilot/voice/greetings"
import { useLaunch } from "~/pilot/launch/useLaunch"
import { UpdatePrompt } from "~/pilot/update/UpdatePrompt"
import { DevStatePanel } from "~/components/home/dev-state-panel"

/** Smooth opacity reveal used by the staged launch sequence. */
function reveal(visible: boolean) {
  return cn(
    "transition-opacity duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    visible ? "opacity-100" : "opacity-0"
  )
}

export default function Home() {
  const [greeting, setGreeting] = useState("")
  const phase = useLaunch()

  useEffect(() => {
    setGreeting(pickGreeting())
    initConfigFromEnv()
    initContext()
  }, [])

  return (
    <main className="relative h-screen overflow-hidden bg-[#03060d] text-white">
      {/* Native macOS overlay title bar provides the traffic lights + dragging. */}

      {/* Aurora background — first to appear. */}
      <div className={cn("pointer-events-none absolute inset-0", reveal(phase >= 1))}>
        <DarkVeil
          hueShift={210}
          noiseIntensity={0.07}
          resolutionScale={1}
          scanlineFrequency={0.7}
          scanlineIntensity={0.02}
          speed={0.04}
          warpAmount={0.12}
        />
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-[radial-gradient(70%_58%_at_58%_22%,rgba(120,150,200,0.16),rgba(60,100,180,0.1)_34%,rgba(4,10,25,0)_68%),radial-gradient(68%_62%_at_46%_44%,rgba(30,80,170,0.12),rgba(0,32,78,0.16)_48%,rgba(0,0,0,0)_78%),radial-gradient(90%_75%_at_18%_94%,rgba(0,0,0,0.82),rgba(0,0,0,0)_54%),linear-gradient(180deg,rgba(2,5,12,0.45)_0%,rgba(2,5,12,0.62)_54%,rgba(2,5,12,0.98)_100%)]",
          reveal(phase >= 1)
        )}
      />

      <div className="absolute inset-0 z-10 flex h-full">
        <div className={cn("z-20 h-full", reveal(phase >= 3))}>
          <AgentsSidebar />
        </div>

        <section className="relative z-10 min-w-0 flex-1">
          <ConversationProvider
            onConnect={() => usePilotStore.getState().setVoiceError(null)}
            onError={(message: unknown) =>
              usePilotStore
                .getState()
                .setVoiceError(
                  typeof message === "string" ? message : "Voice connection error"
                )
            }
          >
            <HomeView greeting={greeting} phase={phase} />
          </ConversationProvider>
        </section>

        <div className={cn("z-20 h-full", reveal(phase >= 3))}>
          <OutputSidebar />
        </div>
      </div>

      <DevStatePanel />
      <UpdatePrompt />
    </main>
  )
}

function HomeView({ greeting, phase }: { greeting: string; phase: number }) {
  const pilotState = usePilotStore((s) => s.pilotState)
  const chatting = usePilotStore((s) => s.conversation.length > 0)
  const glow = glowVisual(pilotState)
  const voice = usePilotVoice()
  // Always-on "Hey PILOT" listener (no visible UI). Logs to console for debug.
  useWakeWord(
    () => {
      if (!voice.active) void voice.start()
    },
    { paused: voice.active }
  )

  // Auto-connect the voice session once the UI has revealed, so PILOT is live
  // on launch — just talk, no click needed. The orb/mic still toggle it.
  const voiceRef = useRef(voice)
  voiceRef.current = voice
  const autoStarted = useRef(false)
  useEffect(() => {
    if (phase >= 3 && !autoStarted.current) {
      autoStarted.current = true
      const t = setTimeout(() => {
        if (!voiceRef.current.active) void voiceRef.current.start()
      }, 600)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Hold the composer's border-glow sweep until the prompt bar has faded in.
  const [glowReady, setGlowReady] = useState(false)
  useEffect(() => {
    if (phase >= 3) {
      const t = setTimeout(() => setGlowReady(true), 1000)
      return () => clearTimeout(t)
    }
  }, [phase])

  return (
    <div className="absolute inset-0">
      <VoiceBanner />

      {/* Orb — centred on first launch, shrinks to a presence at the top once
          a conversation begins. Click it to start / stop a voice session. */}
      <button
        type="button"
        aria-label={voice.active ? "Stop voice session" : "Start voice session"}
        onClick={() => voice.toggle()}
        className={cn(
          "group absolute left-1/2 grid -translate-x-1/2 cursor-pointer place-items-center rounded-full drop-shadow-[0_0_52px_rgba(56,151,255,0.46)] transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          chatting ? "top-[64px] size-28" : "top-1/2 size-72 -translate-y-1/2",
          phase >= 2 ? "opacity-100" : "opacity-0"
        )}
      >
        <PilotOrb />
      </button>

      {/* Greeting — only on the empty home state, revealed last. */}
      <h1
        className={cn(
          "absolute left-1/2 top-[clamp(120px,20vh,240px)] w-full max-w-[720px] -translate-x-1/2 px-6 text-center text-[clamp(28px,3.4vw,54px)] font-semibold leading-[0.98] tracking-tight text-white drop-shadow-[0_18px_42px_rgba(0,0,0,0.28)] transition-opacity duration-[900ms]",
          !chatting && phase >= 3 ? "opacity-100" : "opacity-0"
        )}
      >
        {greeting}
      </h1>

      {/* Transcript — a height-bounded scroll area between the orb and the
          composer; content scrolls within it and stops above the dock. */}
      {chatting ? (
        <div className="absolute inset-x-0 bottom-[152px] top-[176px] overflow-hidden px-[clamp(24px,4vw,72px)]">
          <Transcript />
        </div>
      ) : null}

      {/* Composer dock. */}
      <div className={reveal(phase >= 3)}>
        <div
          className={cn(
            "chat-dock absolute left-1/2 w-[min(calc(100%-48px),760px)] -translate-x-1/2",
            chatting ? "bottom-[24px]" : "top-[82vh]"
          )}
        >
          <div className="relative">
            <BorderGlow
              interactive={false}
              edgeSensitivity={30}
              glowIntensity={glow.glowIntensity}
              coneSpread={25}
              glowRadius={40}
              borderRadius={28}
              animated={glowReady}
              colors={glow.colors}
              backgroundColor="transparent"
            >
              <ReferenceComposer
                onSend={(text) => sendMessage(text)}
                onMic={() => voice.toggle()}
                micActive={voice.active}
              />
            </BorderGlow>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Visible voice status + error surface, driven entirely by the store. */
function VoiceBanner() {
  const pilotState = usePilotStore((s) => s.pilotState)
  const voiceError = usePilotStore((s) => s.voiceError)
  const notice = usePilotStore((s) => s.notice)
  const setVoiceError = usePilotStore((s) => s.setVoiceError)

  let text: string | null = null
  let tone: "error" | "info" = "info"
  if (voiceError) {
    text = voiceError
    tone = "error"
  } else if (notice) {
    text = notice
  } else if (pilotState === "connecting") {
    text = "Connecting to PILOT…"
  } else if (pilotState === "listening") {
    text = "Listening — go ahead"
  } else if (pilotState === "speaking") {
    text = "PILOT is speaking…"
  }

  if (!text) return null
  return (
    <div className="absolute left-1/2 top-6 z-40 -translate-x-1/2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-medium backdrop-blur-xl",
          tone === "error"
            ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
            : "border-white/12 bg-black/55 text-white/85"
        )}
      >
        <span>{text}</span>
        {tone === "error" ? (
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="ml-1 text-white/50 transition hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  )
}

