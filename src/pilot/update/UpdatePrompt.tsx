"use client"

/**
 * In-app auto-update popup. On launch (in the packaged Tauri app only) it checks
 * the GitHub Releases update feed; if a newer signed version exists it shows a
 * card — Peter clicks "Update now", it downloads with a progress bar, installs,
 * and relaunches into the new version. No-ops in the browser / dev.
 */

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

type Phase = "idle" | "available" | "downloading" | "error"

// Minimal shape of the @tauri-apps/plugin-updater Update object we use.
interface TauriUpdate {
  version: string
  body?: string
  downloadAndInstall: (
    onEvent: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void
  ) => Promise<void>
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

export function UpdatePrompt() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [version, setVersion] = useState("")
  const [notes, setNotes] = useState("")
  const [pct, setPct] = useState(0)
  const [update, setUpdate] = useState<TauriUpdate | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!isTauri()) return
      try {
        const { check } = await import("@tauri-apps/plugin-updater")
        const u = (await check()) as TauriUpdate | null
        if (!cancelled && u) {
          setUpdate(u)
          setVersion(u.version)
          setNotes((u.body ?? "").trim())
          setPhase("available")
        }
      } catch {
        /* no update available, offline, or not in Tauri — stay idle */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function install() {
    if (!update) return
    setPhase("downloading")
    try {
      let total = 0
      let got = 0
      await update.downloadAndInstall((e) => {
        if (e.event === "Started") total = e.data?.contentLength ?? 0
        else if (e.event === "Progress") {
          got += e.data?.chunkLength ?? 0
          if (total) setPct(Math.min(100, Math.round((got / total) * 100)))
        } else if (e.event === "Finished") setPct(100)
      })
      const { relaunch } = await import("@tauri-apps/plugin-process")
      await relaunch()
    } catch {
      setPhase("error")
    }
  }

  return (
    <AnimatePresence>
      {phase !== "idle" ? (
        <motion.div
          key="update"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 right-5 z-[700] w-[320px] overflow-hidden rounded-2xl border border-white/12 bg-black/80 p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2c66b8] to-[#e8893b] text-white">
              <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5m0 0-6 6m6-6 6 6" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">
                {phase === "error" ? "Update failed" : `Update available — v${version}`}
              </div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-white/55">
                {phase === "downloading"
                  ? `Downloading… ${pct}%`
                  : phase === "error"
                    ? "Couldn't install the update. Try again later."
                    : notes
                      ? notes.slice(0, 120)
                      : "A new version of PILOT is ready to install."}
              </div>
            </div>
          </div>

          {phase === "downloading" ? (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2c66b8] to-[#e8893b] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPhase("idle")}
                className="rounded-lg px-3 py-1.5 text-[12.5px] text-white/55 transition hover:text-white"
              >
                Later
              </button>
              <button
                type="button"
                data-click-effect
                onClick={install}
                className="rounded-lg bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-black transition hover:bg-white/90 active:scale-95"
              >
                {phase === "error" ? "Retry" : "Update now"}
              </button>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
