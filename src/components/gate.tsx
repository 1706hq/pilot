"use client"

/**
 * Lightweight passcode gate for the hosted (web) build, so the demo isn't open to
 * anyone with the URL. The passcode itself is NEVER in the bundle — only the
 * SHA-256 hash is (NEXT_PUBLIC_PILOT_GATE_HASH), and we compare hashes. When the
 * hash env is unset (the desktop Tauri app, local dev) the gate is OFF and the
 * app renders normally. This is a private-demo gate; real auth comes with the
 * production backend.
 */

import { useEffect, useState } from "react"

const GATE_HASH = process.env.NEXT_PUBLIC_PILOT_GATE_HASH
const OK_KEY = "pilot.gate.ok"

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function Gate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState("")
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setMounted(true)
    // No hash configured (desktop / dev) → no gate. Or already unlocked.
    if (!GATE_HASH || (typeof window !== "undefined" && window.localStorage.getItem(OK_KEY) === "1")) {
      setUnlocked(true)
    }
  }, [])

  if (!mounted) return null
  if (unlocked || !GATE_HASH) return <>{children}</>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChecking(true)
    setError(false)
    const ok = (await sha256Hex(value.trim())) === GATE_HASH
    setChecking(false)
    if (ok) {
      try {
        window.localStorage.setItem(OK_KEY, "1")
      } catch {
        /* ignore */
      }
      setUnlocked(true)
    } else {
      setError(true)
      setValue("")
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#03060d] px-6 text-white">
      <form onSubmit={submit} className="w-full max-w-[320px] text-center">
        <div className="flex items-baseline justify-center font-semibold uppercase leading-none text-[#5aa2ff] [text-shadow:0_0_26px_rgba(56,151,255,0.6)]">
          {["P", "I", "L", "O", "T"].map((ch, i) => (
            <span key={ch} className="flex items-baseline">
              <span className="text-[30px] tracking-[0.06em]">{ch}</span>
              {i < 4 ? <span aria-hidden className="mx-[3px] text-[30px] text-[#5aa2ff]/45">.</span> : null}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-white/45">Enter your passcode to continue.</p>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          placeholder="Passcode"
          className="mt-5 w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-center text-[15px] text-white outline-none transition focus:border-sky-400/40"
        />
        {error ? <p className="mt-2 text-[12px] text-rose-300/90">Incorrect passcode.</p> : null}
        <button
          type="submit"
          disabled={checking || !value.trim()}
          className="mt-4 w-full rounded-xl bg-sky-500/90 px-4 py-3 text-[14px] font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  )
}
