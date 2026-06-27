"use client"

/**
 * Right sidebar — the Runway. Dashboards, cards, links and downloadable files
 * that the CREW creates on the fly touch down here, newest first.
 *
 * Peter's steer (27 Jun): the Runway shouldn't hog the screen when there's
 * nothing on it, and he wants a deliberate open/close at the top — not a panel
 * that flickers open on hover. So it's a collapsed strip by default, opens with
 * a click (or automatically the moment PILOT builds something), and closes with
 * a click. The collapsed strip shows a count so he always knows something's
 * waiting.
 */

import { useEffect, useRef, useState } from "react"
import { AnimatePresence } from "motion/react"

import { Sidebar, SidebarBody } from "~/components/ui/sidebar"
import { cn } from "~/lib/utils"
import { usePilotStore } from "~/pilot/state/store"
import { WidgetCard } from "~/pilot/widgets/WidgetRenderer"
import type { FileCardSpec } from "~/pilot/widgets/types"

function Header({
  open,
  count,
  onToggle,
}: {
  open: boolean
  count: number
  onToggle: () => void
}) {
  const clearWidgets = usePilotStore((s) => s.clearWidgets)

  // Collapsed strip — a single tappable control with a count badge.
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Open the Runway"
        className="relative mx-auto grid size-9 place-items-center rounded-lg text-white/45 transition hover:bg-white/5 hover:text-white/80"
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h10M4 19h7" />
        </svg>
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid size-4 min-w-4 place-items-center rounded-full bg-sky-500 px-1 text-[9px] font-bold leading-none text-white">
            {count}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
        Runway
      </span>
      <div className="flex items-center gap-3">
        {count > 0 ? (
          <button
            type="button"
            onClick={clearWidgets}
            className="text-[11px] text-white/40 transition hover:text-white/70"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Close the Runway"
          className="grid size-6 place-items-center rounded text-white/40 transition hover:text-white/80"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function OutputSidebar() {
  const widgets = usePilotStore((s) => s.widgets)
  const count = widgets.length
  const [open, setOpen] = useState(false)

  // Auto-open the moment something new touches down (Peter asked PILOT to build
  // it → show it). Otherwise it stays exactly where he left it.
  const prev = useRef(0)
  useEffect(() => {
    if (count > prev.current) setOpen(true)
    prev.current = count
  }, [count])

  const handleDownload = (_spec: FileCardSpec) => {
    // Wired to the fs/dialog layer in Phase 5.
  }

  return (
    <Sidebar
      side="right"
      open={open}
      setOpen={() => {}}
      animate
      widthOpen={440}
      widthClosed={52}
    >
      <SidebarBody className="gap-4">
        <Header open={open} count={count} onToggle={() => setOpen((o) => !o)} />
        {open ? (
          <div
            className={cn(
              "model-picker-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-0.5"
            )}
          >
            {count === 0 ? (
              <div className="px-1 pt-2 text-[12px] leading-relaxed text-white/30">
                Charts, reports and files touch down here as PILOT works.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {widgets.map((w) => (
                  <WidgetCard key={w.id} widget={w} onDownload={handleDownload} />
                ))}
              </AnimatePresence>
            )}
          </div>
        ) : null}
      </SidebarBody>
    </Sidebar>
  )
}
