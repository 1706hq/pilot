"use client"

/**
 * Pure-SVG line and bar charts — no chart library. Fixed data shape
 * (series[].points[]), animated on mount with motion. Kept deliberately small
 * and consistent with the app's glassy aesthetic.
 *
 * Charts ALWAYS show their numbers: Y-axis tick values and per-bar value labels,
 * formatted per `yFormat` (number / currency / percent). A chart with no values
 * on it is worse than no chart for a product whose whole promise is real,
 * page-cited figures.
 */

import { motion } from "motion/react"

import { fmtY, type YFormat } from "~/pilot/widgets/format"
import type { ChartSpec } from "~/pilot/widgets/types"

const W = 320
const H = 132
const PAD = { top: 12, right: 10, bottom: 18, left: 40 }

const SERIES_COLORS = ["#56a1ff", "#61f2e7", "#d4ff58", "#ff8f3b", "#c98cff"]

function bounds(spec: ChartSpec) {
  const ys = spec.series.flatMap((s) => s.points.map((p) => p.y))
  // Always include a zero baseline so positive and negative bars share an axis.
  const max = Math.max(0, ...ys)
  const min = Math.min(0, ...ys)
  // Guard a degenerate range (all-equal or single point) so nothing divides by 0.
  return { min, max: max === min ? max + 1 : max }
}

/** Left-hand Y-axis tick values (top = max, middle, bottom = min). */
function YAxis({ min, max, format }: { min: number; max: number; format: YFormat }) {
  const innerH = H - PAD.top - PAD.bottom
  const ticks = [
    { v: max, y: PAD.top + 3 },
    { v: (max + min) / 2, y: PAD.top + innerH / 2 },
    { v: min, y: PAD.top + innerH },
  ]
  return (
    <>
      {ticks.map((t, i) => (
        <text
          key={i}
          x={PAD.left - 6}
          y={t.y}
          textAnchor="end"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="9"
          className="tabular-nums"
        >
          {fmtY(t.v, format)}
        </text>
      ))}
    </>
  )
}

export function LineChart({ spec }: { spec: ChartSpec }) {
  const { min, max } = bounds(spec)
  const labels = spec.series[0]?.points.map((p) => p.x) ?? []
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const sx = (i: number, n: number) =>
    PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const sy = (y: number) => PAD.top + innerH - ((y - min) / (max - min)) * innerH

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map((g) => (
          <line
            key={g}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * g}
            y2={PAD.top + innerH * g}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        <YAxis min={min} max={max} format={spec.yFormat} />
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
                <circle key={i} cx={sx(i, s.points.length)} cy={sy(p.y)} r="2.5" fill={color} />
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
  const sy = (y: number) => PAD.top + innerH - ((y - min) / (max - min)) * innerH
  const zeroY = sy(0) // proper baseline so negative bars draw downward

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <YAxis min={min} max={max} format={spec.yFormat} />
        {/* zero baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
        {points.map((p, i) => {
          const yTop = sy(p.y)
          const h = Math.abs(yTop - zeroY)
          const y = Math.min(yTop, zeroY)
          const x = PAD.left + i * slot + (slot - barW) / 2
          const color = SERIES_COLORS[i % SERIES_COLORS.length]
          const labelAbove = p.y >= 0
          return (
            <g key={i}>
              <motion.rect
                x={x}
                width={barW}
                rx="3"
                fill={color}
                initial={{ height: 0, y: zeroY }}
                animate={{ height: h, y }}
                transition={{ duration: 0.7, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              />
              <text
                x={x + barW / 2}
                y={labelAbove ? y - 3 : y + h + 9}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="8.5"
                className="tabular-nums"
              >
                {fmtY(p.y, spec.yFormat)}
              </text>
            </g>
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
    <div
      className="mt-1 flex justify-between text-[9.5px] text-white/45"
      style={{ paddingLeft: PAD.left, paddingRight: PAD.right }}
    >
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
