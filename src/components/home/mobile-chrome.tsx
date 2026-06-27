"use client"

/**
 * Mobile-only chrome. On a phone the desktop side panels don't fit, so we hide
 * them (md:hidden here, md:block on the panels) and provide the essentials:
 *  - a Settings button (the side cog is gone on mobile),
 *  - a Runway sheet that slides up to show the charts/docs PILOT builds, since
 *    there's no room for the right-hand panel.
 * Everything else (chat, RADAR, the composer with attach + mic) already stacks.
 */

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { usePilotStore } from "~/pilot/state/store"
import { WidgetCard } from "~/pilot/widgets/WidgetRenderer"
import type { FileCardSpec } from "~/pilot/widgets/types"
import { cn } from "~/lib/utils"

/** Top-right Settings button — the only desktop side action mobile still needs. */
export function MobileTopBar({ className }: { className?: string }) {
  const setSettingsOpen = usePilotStore((s) => s.setSettingsOpen)
  return (
    <button
      type="button"
      onClick={() => setSettingsOpen(true)}
      aria-label="Settings"
      className={cn(
        "absolute right-3 top-3 z-40 grid size-9 place-items-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition active:scale-95 md:hidden",
        className
      )}
    >
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </button>
  )
}

/** Floating Runway button + slide-up sheet for the artifacts PILOT builds. */
export function MobileRunway() {
  const widgets = usePilotStore((s) => s.widgets)
  const clearWidgets = usePilotStore((s) => s.clearWidgets)
  const [open, setOpen] = useState(false)
  if (widgets.length === 0) return null

  const handleDownload = (_spec: FileCardSpec) => {}

  return (
    <div className="md:hidden">
      {/* Trigger — sits above the composer, shows how many things are on the Runway. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[92px] right-4 z-40 flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/15 px-4 py-2.5 text-[13px] font-medium text-sky-100 shadow-[0_0_24px_rgba(56,151,255,0.25)] backdrop-blur-md active:scale-95"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h16M4 19h10" />
        </svg>
        Runway · {widgets.length}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[200] flex flex-col bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="mt-auto max-h-[86vh] overflow-hidden rounded-t-3xl border-t border-white/12 bg-[#0a0e16]/95"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Runway
                </span>
                <div className="flex items-center gap-3 text-[12px]">
                  <button type="button" onClick={() => { clearWidgets(); setOpen(false) }} className="text-white/45">
                    Clear
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-white/70">
                    Done
                  </button>
                </div>
              </div>
              <div className="model-picker-scroll flex max-h-[74vh] flex-col gap-3 overflow-y-auto px-4 pb-8">
                <AnimatePresence initial={false}>
                  {widgets.map((w) => (
                    <WidgetCard key={w.id} widget={w} onDownload={handleDownload} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
