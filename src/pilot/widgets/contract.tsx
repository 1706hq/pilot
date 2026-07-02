"use client"

/**
 * SHIELD's contract review card — parties, the binding dates as a deadline
 * board (urgency computed deterministically, never by the model), obligations
 * on Peter's side, and the risks worth counsel's eyes.
 */

import { dateUrgency, type DateUrgency } from "~/pilot/analyst/shield"
import type { ContractSpec } from "~/pilot/widgets/types"

const URGENCY: Record<DateUrgency, { color: string; label: string }> = {
  past: { color: "#f87171", label: "passed" },
  soon: { color: "#fbbf24", label: "soon" },
  later: { color: "#7ef29b", label: "later" },
  unknown: { color: "rgba(255,255,255,0.35)", label: "" },
}

function DeadlineRow({ label, date, note }: { label: string; date: string; note?: string }) {
  const u = URGENCY[dateUrgency(date)]
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: u.color, boxShadow: `0 0 6px ${u.color}88` }}
      />
      <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">{label}</span>
      <span className="shrink-0 text-right">
        <span className="font-mono text-[11px] tabular-nums text-white/85">{date}</span>
        {note ? <span className="ml-1.5 text-[10.5px] text-white/40">{note}</span> : null}
        {u.label ? (
          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: u.color }}>
            {u.label}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function Section({ label, items, mark, color }: { label: string; items: string[]; mark: string; color: string }) {
  if (items.length === 0) return null
  return (
    <div className="mt-4">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/35">{label}</div>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-snug text-white/70">
            <span className={`shrink-0 font-mono ${color}`}>{mark}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ContractCard({ spec }: { spec: ContractSpec }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#a78bfa]/85">
        Shield · contract review
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-snug text-white">{spec.title}</div>
      {spec.parties.length ? (
        <div className="mt-0.5 truncate text-[11px] text-white/45">{spec.parties.join("  ·  ")}</div>
      ) : null}
      <p className="mt-2 text-[12.5px] leading-snug text-white/60">{spec.summary}</p>

      {spec.dates.length ? (
        <div className="mt-3.5 rounded-lg bg-white/[0.04] px-3 py-2">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/35">
            Dates that bind
          </div>
          <div className="mt-1 divide-y divide-white/[0.05]">
            {spec.dates.map((d, i) => (
              <DeadlineRow key={i} {...d} />
            ))}
          </div>
        </div>
      ) : null}

      <Section label="Obligations on your side" items={spec.obligations} mark="•" color="text-sky-300/90" />
      <Section label="Risks" items={spec.risks} mark="!" color="text-amber-300/90" />

      <p className="mt-4 border-t border-white/8 pt-2 text-[10px] leading-snug text-white/35">
        SHIELD's first pass, not legal advice — anything marked for counsel deserves exactly that.
      </p>
    </div>
  )
}
