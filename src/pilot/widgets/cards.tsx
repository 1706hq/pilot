"use client"

/**
 * Leaf widget components: stat, table, link and file cards. These render the
 * inner content; WidgetRenderer wraps each in the glowing frame.
 */

import type {
  FileCardSpec,
  LinkCardSpec,
  StatCardSpec,
  TableSpec,
  WidgetAccent,
} from "~/pilot/widgets/types"

const ACCENT_HEX: Record<WidgetAccent, string> = {
  blue: "#56a1ff",
  green: "#4fe0b0",
  amber: "#ffb648",
  red: "#ff6b6b",
  violet: "#a07bff",
}

export function accentHex(accent: WidgetAccent | undefined) {
  return ACCENT_HEX[accent ?? "blue"]
}

export function StatCard({ spec }: { spec: StatCardSpec }) {
  const color = accentHex(spec.accent)
  const dir = spec.delta?.direction
  const deltaColor =
    dir === "up" ? "#4fe0b0" : dir === "down" ? "#ff6b6b" : "#a0aab8"
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-white/45">
        {spec.label}
      </div>
      <div
        className="mt-1 text-[26px] font-semibold leading-none"
        style={{ color }}
      >
        {spec.value}
      </div>
      {spec.delta ? (
        <div className="mt-1.5 flex items-center gap-1 text-[12px]" style={{ color: deltaColor }}>
          <span>{dir === "up" ? "▲" : dir === "down" ? "▼" : "—"}</span>
          <span>{spec.delta.value}</span>
        </div>
      ) : null}
    </div>
  )
}

export function TableCard({ spec }: { spec: TableSpec }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-white/45">
            {spec.columns.map((c) => (
              <th
                key={c.key}
                className={`pb-2 font-medium ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-white/8">
              {spec.columns.map((c) => (
                <td
                  key={c.key}
                  className={`py-1.5 text-white/80 ${
                    c.align === "right" ? "text-right tabular-nums" : "text-left"
                  }`}
                >
                  {row[c.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LinkCard({ spec }: { spec: LinkCardSpec }) {
  return (
    <button
      type="button"
      data-click-effect
      onClick={() => {
        // Opening externally is wired to the opener plugin via the tool layer;
        // fall back to window.open in the browser preview.
        window.open(spec.url, "_blank")
      }}
      className="flex w-full items-center gap-3 text-left"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/8 text-[16px]">
        {spec.favicon ?? "🔗"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-white">
          {spec.title}
        </span>
        {spec.description ? (
          <span className="block truncate text-[11.5px] text-white/45">
            {spec.description}
          </span>
        ) : (
          <span className="block truncate text-[11.5px] text-white/35">
            {spec.url}
          </span>
        )}
      </span>
      <svg
        className="size-4 shrink-0 text-white/35"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
      </svg>
    </button>
  )
}

function formatBytes(bytes?: number) {
  if (!bytes) return ""
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`
  return `${bytes} B`
}

export function FileCard({
  spec,
  onDownload,
}: {
  spec: FileCardSpec
  onDownload?: (spec: FileCardSpec) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/8 text-[18px]">
        {spec.kind === "invoice" ? "🧾" : spec.kind === "report" ? "📊" : "📄"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-white">
          {spec.fileName}
        </span>
        <span className="block text-[11px] text-white/40">
          {spec.kind.toUpperCase()}
          {spec.sizeBytes ? ` · ${formatBytes(spec.sizeBytes)}` : ""}
        </span>
      </span>
      <button
        type="button"
        data-click-effect
        onClick={() => onDownload?.(spec)}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 active:scale-95"
        aria-label={`Download ${spec.fileName}`}
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"
          />
        </svg>
      </button>
    </div>
  )
}
