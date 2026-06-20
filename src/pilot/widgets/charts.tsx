"use client"

/**
 * Pure-SVG line and bar charts — no chart library. Fixed data shape
 * (series[].points[]), animated on mount with motion. Kept deliberately small
 * and consistent with the app's glassy aesthetic.
 */

import { motion } from "motion/react"

import type { ChartSpec } from "~/pilot/widgets/types"

const W = 280
const H = 120
const PAD = { top: 10, right: 8, bottom: 18, left: 8 }

const SERIES_COLORS = ["#56a1ff", "#61f2e7", "#d4ff58", "#ff8f3b", "#c98cff"]

function bounds(spec: ChartSpec) {
  const ys = spec.series.flatMap((s) => s.points.map((p) => p.y))
  const max = Math.max(0, ...ys)
  const min = Math.min(0, ...ys)
  return { min, max: max === min ? max + 1 : max }
}

export function LineChart({ spec }: { spec: ChartSpec }) {
  const { min, max } = bounds(spec)
  const labels = spec.series[0]?.points.map((p) => p.x) ?? []
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const sx = (i: number, n: number) =>
    PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const sy = (y: number) =>
    PAD.top + innerH - ((y - min) / (max - min)) * innerH

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * g}
            y2={PAD.top + innerH * g}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        {spec.series.map((s, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length]
          const d = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(i, s.points.length)} ${sy(p.y)}`)
            .join(" ")
          return (
            <g key={s.name}>
              <motion.path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(i, s.points.length)}
                  cy={sy(p.y)}
                  r="2.5"
                  fill={color}
                />
              ))}
            </g>
          )
        })}
      </svg>
      <ChartLabels labels={labels} />
      {spec.series.length > 1 ? <Legend spec={spec} /> : null}
    </div>
  )
}

export function BarChart({ spec }: { spec: ChartSpec }) {
  const { min, max } = bounds(spec)
  const series = spec.series[0]
  const points = series?.points ?? []
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const slot = innerW / Math.max(points.length, 1)
  const barW = Math.min(28, slot * 0.6)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {points.map((p, i) => {
          const h = ((p.y - min) / (max - min)) * innerH
          const x = PAD.left + i * slot + (slot - barW) / 2
          const y = PAD.top + innerH - h
          const color = SERIES_COLORS[i % SERIES_COLORS.length]
          return (
            <motion.rect
              key={i}
              x={x}
              width={barW}
              rx="3"
              fill={color}
              initial={{ height: 0, y: PAD.top + innerH }}
              animate={{ height: h, y }}
              transition={{
                duration: 0.7,
                delay: i * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          )
        })}
      </svg>
      <ChartLabels labels={points.map((p) => p.x)} />
    </div>
  )
}

function ChartLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null
  // Show at most ~6 labels to avoid crowding.
  const step = Math.ceil(labels.length / 6)
  return (
    <div className="mt-1 flex justify-between px-1 text-[9.5px] text-white/35">
      {labels
        .filter((_, i) => i % step === 0)
        .map((l, i) => (
          <span key={i} className="truncate">
            {l}
          </span>
        ))}
    </div>
  )
}

function Legend({ spec }: { spec: ChartSpec }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/55">
      {spec.series.map((s, i) => (
        <span key={s.name} className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
          />
          {s.name}
        </span>
      ))}
    </div>
  )
}

export function Chart({ spec }: { spec: ChartSpec }) {
  return spec.variant === "bar" ? <BarChart spec={spec} /> : <LineChart spec={spec} />
}
