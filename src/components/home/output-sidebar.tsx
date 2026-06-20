"use client"

/**
 * Right sidebar — the output surface. Dashboards, cards, links and downloadable
 * files that the CREW creates on the fly land here, newest first.
 */

import { useState } from "react"
import { AnimatePresence } from "motion/react"

import { Sidebar, SidebarBody, useSidebar } from "~/components/ui/sidebar"
import { cn } from "~/lib/utils"
import { usePilotStore } from "~/pilot/state/store"
import { WidgetCard } from "~/pilot/widgets/WidgetRenderer"
import type { FileCardSpec } from "~/pilot/widgets/types"

function Header() {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  const clearWidgets = usePilotStore((s) => s.clearWidgets)
  const count = usePilotStore((s) => s.widgets.length)

  if (!expanded) {
    return (
      <div className="grid place-items-center text-white/40">
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h10M4 19h7" />
        </svg>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
        Output
      </span>
      {count > 0 ? (
        <button
          type="button"
          onClick={clearWidgets}
          className="text-[11px] text-white/40 transition hover:text-white/70"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}

export function OutputSidebar() {
  const widgets = usePilotStore((s) => s.widgets)
  const hasWidgets = widgets.length > 0
  const [hovered, setHovered] = useState(false)

  // Stays open while there's something to show; otherwise it's a hover-
  // collapsible panel like the left sidebar.
  const open = hasWidgets || hovered

  const handleDownload = (_spec: FileCardSpec) => {
    // Wired to the fs/dialog layer in Phase 5.
  }

  return (
    <Sidebar side="right" open={open} setOpen={setHovered} widthOpen={440}>
      <SidebarBody className="gap-4">
        <Header />
        <div
          className={cn(
            "model-picker-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-0.5"
          )}
        >
          {widgets.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence initial={false}>
              {widgets.map((w) => (
                <WidgetCard key={w.id} widget={w} onDownload={handleDownload} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </SidebarBody>
    </Sidebar>
  )
}

function EmptyState() {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  if (!expanded) return null
  return (
    <div className="px-1 pt-2 text-[12px] leading-relaxed text-white/30">
      Dashboards, reports and files will appear here as PILOT works.
    </div>
  )
}
