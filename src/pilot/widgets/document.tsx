"use client"

/**
 * Document widget — a clean report / brief / note card. Renders light markdown:
 * ## headings, **bold**, `*`/`-` bullets, blank-line paragraph breaks.
 */

import type { DocumentSpec } from "~/pilot/widgets/types"

function inline(text: string, key: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${key}-${i}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${key}-${i}`}>{part}</span>
    )
  )
}

function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const t = line.trim()
        if (t === "") return <div key={i} className="h-2" />
        if (t.startsWith("### ")) {
          return (
            <div key={i} className="mt-3 text-[12.5px] font-semibold text-white/90">
              {inline(t.slice(4), `h${i}`)}
            </div>
          )
        }
        if (t.startsWith("## ")) {
          return (
            <div key={i} className="mt-3 text-[13.5px] font-semibold text-white">
              {inline(t.slice(3), `h${i}`)}
            </div>
          )
        }
        if (/^[*-]\s+/.test(t)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="select-none text-white/35">•</span>
              <span>{inline(t.replace(/^[*-]\s+/, ""), `b${i}`)}</span>
            </div>
          )
        }
        return (
          <p key={i} className="leading-relaxed">
            {inline(line, `p${i}`)}
          </p>
        )
      })}
    </>
  )
}

export function DocumentCard({ spec }: { spec: DocumentSpec }) {
  return (
    <div>
      <div className="text-[15px] font-semibold leading-snug text-white">
        {spec.title}
      </div>
      {spec.subtitle ? (
        <div className="mt-0.5 text-[12px] text-white/45">{spec.subtitle}</div>
      ) : null}
      <div className="mt-2.5 space-y-0.5 text-[13px] text-white/85">
        <Markdown text={spec.body} />
      </div>
    </div>
  )
}
