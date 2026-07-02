"use client"

/**
 * PEGASUS's pitch-screen verdict card — the Dragon's one-pager. Score pips,
 * the ask exactly as the deck states it, the call, strengths vs concerns, and
 * the questions to put to the founder. Built only by the analyst pipeline over
 * verified extraction, never by the widget-generating LLM.
 */

import type { PitchSpec } from "~/pilot/widgets/types"

function scoreColor(score: number): string {
  if (score >= 4) return "#7ef29b" // fight for it
  if (score === 3) return "#fbbf24" // worth a look
  return "#f87171" // walk away
}

function ScorePips({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <div className="flex items-center gap-1" title={`Dragon score ${score}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="size-2 rotate-45"
          style={{
            backgroundColor: i <= score ? color : "rgba(255,255,255,0.10)",
            boxShadow: i <= score ? `0 0 8px ${color}66` : "none",
          }}
        />
      ))}
    </div>
  )
}

function List({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: "good" | "warn" | "ask"
}) {
  if (items.length === 0) return null
  const mark = tone === "good" ? "✓" : tone === "warn" ? "!" : "?"
  const color =
    tone === "good" ? "text-emerald-300/90" : tone === "warn" ? "text-amber-300/90" : "text-sky-300/90"
  return (
    <div>
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

export function PitchCard({ spec }: { spec: PitchSpec }) {
  const color = scoreColor(spec.score)
  return (
    <div>
      {/* header — who's pitching + the score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#7ef29b]/80">
            Pegasus · pitch screen
          </div>
          <div className="mt-1 truncate text-[16px] font-semibold text-white">{spec.company}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-white/55">{spec.oneLiner}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <ScorePips score={spec.score} />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
            {spec.sector}
          </span>
        </div>
      </div>

      {/* the ask — exactly as the deck states it */}
      <div className="mt-3 flex items-baseline gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/35">The ask</span>
        <span className="text-[13px] font-medium text-white/85">{spec.ask}</span>
      </div>

      {/* the call */}
      <div className="mt-3 flex gap-2.5 pl-0.5">
        <span aria-hidden className="w-[2.5px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-[13px] font-medium leading-snug text-white/90">{spec.verdict}</p>
      </div>

      {/* strengths / concerns */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <List label="Strengths" items={spec.strengths} tone="good" />
        <List label="Concerns" items={spec.concerns} tone="warn" />
      </div>

      {/* the questions */}
      {spec.questions.length > 0 ? (
        <div className="mt-4">
          <List label="Ask the founder" items={spec.questions} tone="ask" />
        </div>
      ) : null}
    </div>
  )
}
