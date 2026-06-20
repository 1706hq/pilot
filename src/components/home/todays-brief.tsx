"use client"

/**
 * Today's Brief — the morning decision summary on the idle home. Peter asked for
 * this back: "when we scrolled down previously you could see a summary called
 * Today's brief." It sits below the orb on the resting screen.
 *
 * Content is seeded/illustrative (see brief.ts) and labelled "Preview" so it's
 * honest until wired to real signals.
 */

import { TODAYS_BRIEF, type BriefItem, type BriefUrgency } from "~/pilot/brief/brief"
import { AGENTS } from "~/pilot/agents/agents"
import { cn } from "~/lib/utils"

const URGENCY: Record<BriefUrgency, { label: string; dot: string; text: string }> = {
  now: { label: "Now", dot: "bg-amber-400", text: "text-amber-300/90" },
  today: { label: "Today", dot: "bg-sky-400", text: "text-sky-300/90" },
  watch: { label: "Watching", dot: "bg-white/40", text: "text-white/45" },
}

function BriefRow({ item }: { item: BriefItem }) {
  const accent = AGENTS[item.agent].accent
  const u = URGENCY[item.urgency]
  return (
    <div className="group flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.05]">
      <span
        className="mt-1 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}99` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-white/90">
            {item.title}
          </span>
          {item.when ? (
            <span className="shrink-0 rounded-full bg-white/8 px-2 py-px text-[10px] font-medium tabular-nums text-white/55">
              {item.when}
            </span>
          ) : null}
          <span className={cn("ml-auto flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]", u.text)}>
            <span className={cn("size-1.5 rounded-full", u.dot)} />
            {u.label}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">{item.detail}</p>
        <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: accent }}>
          {AGENTS[item.agent].name}
        </div>
      </div>
    </div>
  )
}

export function TodaysBrief({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
          Today&apos;s Brief
        </span>
        <span
          className="rounded-full border border-white/10 bg-white/5 px-2 py-px text-[9px] font-medium uppercase tracking-[0.14em] text-white/35"
          title="Seeded preview — not yet wired to live data"
        >
          Preview
        </span>
      </div>
      <div className="model-picker-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-1 pb-2">
        {TODAYS_BRIEF.map((item) => (
          <BriefRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
