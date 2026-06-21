/**
 * BLACKBOX Stage 3 — consolidate. Pure function: merge the per-page extractions
 * into one normalized, grounded knowledge base (ledger + narrative + feedback +
 * entities). No model calls, no interpretation — just structure-aware merging,
 * so the same code runs in the app and in the verification harness.
 *
 * Table shape these packs use: a table has section-header rows (no cells, e.g.
 * "Despatched Sales", "Margin") followed by dimension rows (Retail / Ecomm /
 * Clubs / Total AGT …) carrying the figures. We track the current section as the
 * `metric` and emit one LedgerRecord per dimension row.
 */

import type {
  Cell,
  Entity,
  ExtractedPage,
  FeedbackItem,
  LedgerRecord,
  NarrativeItem,
  Unit,
} from "~/pilot/analyst/types"

const CHANNELS = ["retail", "ecomm", "e-comm", "marketplaces", "marketplace", "total agt", "total"]

function num(c: Cell | undefined): number | undefined {
  return c && typeof c.value === "number" ? c.value : undefined
}

/** Find the cell whose column matches all `must` substrings and none of `not`. */
function pick(cells: Cell[], must: string[], not: string[] = []): Cell | undefined {
  return cells.find((c) => {
    const k = c.column.toLowerCase()
    return must.every((m) => k.includes(m)) && not.every((n) => !k.includes(n))
  })
}

export interface Consolidated {
  ledger: LedgerRecord[]
  narrative: NarrativeItem[]
  feedback: FeedbackItem[]
  entities: Entity[]
}

export function consolidate(pages: ExtractedPage[]): Consolidated {
  const ledger: LedgerRecord[] = []
  const narrative: NarrativeItem[] = []
  const feedback: FeedbackItem[] = []
  const entityKeys = new Set<string>()
  const entities: Entity[] = []

  const addEntity = (kind: Entity["kind"], name: string) => {
    const key = `${kind}:${name.toLowerCase()}`
    if (name && !entityKeys.has(key)) {
      entityKeys.add(key)
      entities.push({ kind, name })
    }
  }

  for (const page of pages) {
    const grain = page.grain || "unstated"

    for (const table of page.tables ?? []) {
      let metric = table.title || "Metrics"
      for (const row of table.rows ?? []) {
        const cells = row.cells ?? []
        const hasNumbers = cells.some((c) => typeof c.value === "number")
        // Section-header row (no figures) re-sets the current metric.
        if (!hasNumbers) {
          if (row.label?.trim()) metric = row.label.trim()
          continue
        }
        const act = pick(cells, ["act"]) ?? pick(cells, ["actual"])
        const bud = pick(cells, ["bud"], ["vs", "%"])
        const vsBudCell = pick(cells, ["vs bud"], ["%"])
        const vsBudPctCell = pick(cells, ["bud", "%"])
        const vsLYCell = pick(cells, ["ly"], ["%"]) ?? pick(cells, ["lfl"], ["%"])
        const lflPctCell = pick(cells, ["lfl", "%"])
        // Headline value: Actual if present, else the first numeric cell.
        const firstNum = cells.find((c) => typeof c.value === "number")
        const value = num(act) ?? num(firstNum)
        if (value === undefined) continue
        const unit: Unit = (act ?? firstNum)?.unit ?? "£k"

        const dim = row.label?.trim() || "—"
        if (CHANNELS.includes(dim.toLowerCase())) addEntity("channel", dim)
        else addEntity("category", dim)

        ledger.push({
          metric,
          dimension: dim,
          grain,
          value,
          unit,
          bud: num(bud),
          vsBud: num(vsBudCell),
          vsBudPct: num(vsBudPctCell),
          vsLY: num(vsLYCell),
          lflPct: num(lflPctCell),
          table: table.title,
          sourcePage: page.sourcePage,
          confidence: 1,
        })
      }
    }

    for (const n of page.narrative ?? []) {
      if (n.text?.trim()) {
        narrative.push({ ...n, sourcePage: page.sourcePage })
        if (n.owner) addEntity("store", n.owner) // owners surface as entities too
      }
    }

    // Feedback heuristic — pages mentioning Trustpilot / customer service.
    const title = (page.pageTitle || "").toLowerCase()
    if (title.includes("trustpilot") || title.includes("customer")) {
      for (const n of page.narrative ?? []) {
        if (n.text?.trim())
          feedback.push({
            source: title.includes("trustpilot") ? "trustpilot" : "customer-service",
            theme: n.text.slice(0, 120),
            quote: n.text,
            sourcePage: page.sourcePage,
          })
      }
    }
  }

  return { ledger, narrative, feedback, entities }
}
