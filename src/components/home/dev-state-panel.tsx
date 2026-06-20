"use client"

/**
 * Dev-only control panel: cycle the Orb through every pilotState and seed demo
 * widgets into the right sidebar. Used to verify visuals without the full
 * orchestrator/voice stack. Hidden in production builds.
 */

import { usePilotStore } from "~/pilot/state/store"
import type { PilotState } from "~/pilot/types"
import type { WidgetBody } from "~/pilot/widgets/types"

const STATES: PilotState[] = [
  "idle",
  "connecting",
  "listening",
  "thinking",
  "speaking",
]

const DEMO_DASHBOARD: WidgetBody = {
  type: "dashboard",
  title: "American Golf · Week 20",
  children: [
    { type: "stat", label: "Revenue vs budget", value: "-21.5%", delta: { value: "behind", direction: "down" }, accent: "red" },
    { type: "stat", label: "Ecomm mix", value: "43.5%", delta: { value: "+7.0pts", direction: "up" }, accent: "green" },
    {
      type: "chart",
      title: "Footfall vs last year",
      variant: "line",
      yFormat: "number",
      series: [
        { name: "This year", points: [
          { x: "W16", y: 82 }, { x: "W17", y: 79 }, { x: "W18", y: 74 },
          { x: "W19", y: 71 }, { x: "W20", y: 67 },
        ] },
        { name: "Last year", points: [
          { x: "W16", y: 96 }, { x: "W17", y: 95 }, { x: "W18", y: 93 },
          { x: "W19", y: 90 }, { x: "W20", y: 88 },
        ] },
      ],
    },
  ],
}

const DEMO_STAT: WidgetBody = {
  type: "stat",
  label: "Cash position",
  value: "£4.2M",
  delta: { value: "+£180k MoM", direction: "up" },
  accent: "green",
}

export function DevStatePanel() {
  const setPilotState = usePilotStore((s) => s.setPilotState)
  const pilotState = usePilotStore((s) => s.pilotState)
  const addWidget = usePilotStore((s) => s.addWidget)
  const clearWidgets = usePilotStore((s) => s.clearWidgets)
  const addTask = usePilotStore((s) => s.addTask)

  if (process.env.NODE_ENV === "production") return null

  return (
    <div className="fixed bottom-3 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-1.5 text-[11px] backdrop-blur-xl">
      <span className="px-1 text-white/30">dev</span>
      {STATES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setPilotState(s)}
          className={`rounded-full px-2 py-1 transition ${
            pilotState === s
              ? "bg-white text-black"
              : "text-white/60 hover:bg-white/10"
          }`}
        >
          {s}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-white/10" />
      <button
        type="button"
        onClick={() => {
          addWidget(DEMO_DASHBOARD, "MARSHALL")
          addWidget(DEMO_STAT, "STERLING")
          addTask({ label: "Compiling Week 20 KPIs", agent: "MARSHALL", status: "working" })
          addTask({ label: "Reconciling cash position", agent: "STERLING", status: "done" })
        }}
        className="rounded-full px-2 py-1 text-white/60 transition hover:bg-white/10"
      >
        + demo
      </button>
      <button
        type="button"
        onClick={clearWidgets}
        className="rounded-full px-2 py-1 text-white/60 transition hover:bg-white/10"
      >
        clear
      </button>
    </div>
  )
}
