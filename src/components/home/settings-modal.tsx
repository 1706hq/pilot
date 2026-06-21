"use client"

/**
 * Settings — bring-your-own-key. Peter pastes his OpenRouter + ElevenLabs keys
 * here; they're saved to localStorage on THIS device only (never baked into the
 * app, never sent anywhere but the APIs themselves). Opened from the cog in the
 * left sidebar, and auto-opened on first launch when no key is set yet.
 */

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "~/lib/utils"
import { usePilotStore } from "~/pilot/state/store"
import {
  DEFAULT_AGENT_ID,
  DEFAULT_MODEL,
  saveConfig,
  testElevenLabs,
  testOpenRouterKey,
  type KeyTest,
} from "~/pilot/storage/config"

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  secret = false,
  mono = false,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  secret?: boolean
  mono?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-white/80">{label}</span>
        {hint ? <span className="text-[10.5px] text-white/35">{hint}</span> : null}
      </div>
      <div className="relative">
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none transition focus:border-sky-400/50 focus:bg-black/60",
            secret ? "pr-11" : "",
            mono ? "font-mono" : ""
          )}
        />
        {secret ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide" : "Show"}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {show ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.5 9.5 0 0 1 12 5c5 0 9 4.5 9 7a13 13 0 0 1-2.2 3M6.3 6.3A13 13 0 0 0 3 12c0 2.5 4 7 9 7a9.5 9.5 0 0 0 3.1-.5" />
                </>
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        ) : null}
      </div>
    </label>
  )
}

function ResultRow({ label, result }: { label: string; result?: KeyTest }) {
  if (!result) return null
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold",
          result.ok ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"
        )}
      >
        {result.ok ? "✓" : "✕"}
      </span>
      <span className="min-w-0">
        <span className="font-medium text-white/80">{label}: </span>
        <span className={result.ok ? "text-emerald-300/90" : "text-rose-300/90"}>
          {result.message}
        </span>
      </span>
    </div>
  )
}

export function SettingsModal() {
  const open = usePilotStore((s) => s.settingsOpen)
  const setOpen = usePilotStore((s) => s.setSettingsOpen)
  const config = usePilotStore((s) => s.config)

  const [openRouterKey, setOpenRouterKey] = useState("")
  const [elevenLabsKey, setElevenLabsKey] = useState("")
  const [agentId, setAgentId] = useState("")
  const [model, setModel] = useState("")
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<{ or?: KeyTest; el?: KeyTest } | null>(null)

  // Re-seed the form from the live config whenever the panel opens.
  useEffect(() => {
    if (open) {
      setOpenRouterKey(config.openRouterKey ?? "")
      setElevenLabsKey(config.elevenLabsKey ?? "")
      setAgentId(config.elevenLabsAgentId ?? DEFAULT_AGENT_ID)
      setModel(config.model ?? DEFAULT_MODEL)
      setSaved(false)
      setResults(null)
      setTesting(false)
    }
  }, [open, config])

  const runTest = async () => {
    setTesting(true)
    setResults(null)
    const [or, el] = await Promise.all([
      testOpenRouterKey(openRouterKey),
      testElevenLabs(elevenLabsKey, agentId || DEFAULT_AGENT_ID),
    ])
    setResults({ or, el })
    setTesting(false)
  }

  // Esc to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  const onSave = () => {
    saveConfig({
      openRouterKey,
      elevenLabsKey,
      elevenLabsAgentId: agentId || DEFAULT_AGENT_ID,
      model: model || DEFAULT_MODEL,
    })
    setSaved(true)
    usePilotStore.getState().setNotice("Settings saved on this device")
    setTimeout(() => usePilotStore.getState().setNotice(null), 3000)
    setTimeout(() => setOpen(false), 450)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[500] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <motion.div
            className="w-[min(92vw,520px)] overflow-hidden rounded-2xl border border-white/12 bg-[#0a0e16]/95 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between border-b border-white/8 px-6 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Settings</h2>
                <p className="mt-0.5 text-[12px] text-white/45">
                  Your keys are saved on this device only — never uploaded or shared.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                className="-mr-1 grid size-8 place-items-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              <Field
                label="OpenRouter API key"
                hint="for chat + canvas"
                value={openRouterKey}
                onChange={setOpenRouterKey}
                placeholder="sk-or-…"
                secret
                mono
              />
              <Field
                label="ElevenLabs API key"
                hint="for voice"
                value={elevenLabsKey}
                onChange={setElevenLabsKey}
                placeholder="sk_…"
                secret
                mono
              />
              <Field
                label="ElevenLabs Agent ID"
                hint="prefilled — leave as-is"
                value={agentId}
                onChange={setAgentId}
                placeholder={DEFAULT_AGENT_ID}
                mono
              />
              <Field
                label="Model"
                hint="OpenRouter model id"
                value={model}
                onChange={setModel}
                placeholder={DEFAULT_MODEL}
                mono
              />
              <p className="text-[11px] leading-relaxed text-white/35">
                Get an OpenRouter key at openrouter.ai/keys and an ElevenLabs key in
                your ElevenLabs profile. PILOT talks to those services directly from
                this Mac.
              </p>

              {results ? (
                <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3">
                  <ResultRow label="OpenRouter (chat)" result={results.or} />
                  <ResultRow label="ElevenLabs (voice)" result={results.el} />
                  {results.or?.ok && results.el?.ok ? (
                    <p className="mt-0.5 text-[11px] text-emerald-300/80">
                      Both good — hit Save and you&apos;re away.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/8 px-6 py-4">
              <button
                type="button"
                onClick={runTest}
                disabled={testing}
                className="rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {testing ? "Testing…" : "Test keys"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-2 text-[13px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(56,151,255,0.4)] transition hover:bg-sky-400 active:scale-95"
                >
                  {saved ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
