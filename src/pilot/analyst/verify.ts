/**
 * BLACKBOX Stage 2 — audit. Deterministic arithmetic reconciliation over the
 * extracted pages: it re-derives what the numbers should be and flags anything
 * that doesn't tie out, rather than smoothing it over. Pure + cheap, so it runs
 * on every page in both the app and the harness.
 *
 * Checks: Act − Bud = stated vsBud; vsBud% ≈ vsBud / Bud; and channel rows
 * (Retail+Ecomm+Marketplaces) sum to the stated Total within tolerance.
 *
 * (A second VISION audit pass is also valuable for chart/illegible pages; this
 * deterministic pass is the always-on backbone and is what the acceptance
 * "totals reconcile" criterion checks.)
 */

import { findCol, isActual, isBudget, isVsBud, isVsBudPct } from "~/pilot/analyst/columns"
import type { AuditFlag, Cell, ExtractedPage } from "~/pilot/analyst/types"

function n(cell: Cell | undefined): number | undefined {
  return cell && typeof cell.value === "number" ? cell.value : undefined
}

const CHANNELS = ["retail", "ecomm", "e-comm", "marketplaces", "marketplace"]
const TOTAL = ["total agt", "total"]

export interface Reconciliation {
  flags: AuditFlag[]
  checks: number
  passed: number
}

export function reconcile(pages: ExtractedPage[]): Reconciliation {
  const flags: AuditFlag[] = []
  let checks = 0
  let passed = 0

  for (const page of pages) {
    for (const table of page.tables ?? []) {
      const channelRows: Record<string, number> = {}
      let totalRow: number | undefined
      let totalLabel = ""

      for (const row of table.rows ?? []) {
        const cells = row.cells ?? []
        const act = n(findCol(cells, isActual))
        const bud = n(findCol(cells, isBudget))
        const vsBud = n(findCol(cells, isVsBud))
        const vsBudPct = n(findCol(cells, isVsBudPct))
        const label = (row.label || "").toLowerCase()

        // Check 1: Act − Bud = vsBud.
        if (act !== undefined && bud !== undefined && vsBud !== undefined) {
          checks++
          if (Math.abs(act - bud - vsBud) <= Math.max(1, Math.abs(vsBud) * 0.02)) passed++
          else
            flags.push({
              sourcePage: page.sourcePage,
              field: `${table.title} · ${row.label} · vsBud`,
              issue: `Act−Bud (${act}−${bud}=${act - bud}) ≠ stated vsBud ${vsBud}`,
              confidence: 0.4,
            })
        }
        // Check 2: vsBud% ≈ vsBud / Bud.
        if (vsBud !== undefined && bud && vsBudPct !== undefined) {
          checks++
          const derived = (vsBud / bud) * 100
          if (Math.abs(derived - vsBudPct) <= 1.5) passed++
          else
            flags.push({
              sourcePage: page.sourcePage,
              field: `${table.title} · ${row.label} · vsBud%`,
              issue: `vsBud/Bud (${derived.toFixed(1)}%) ≠ stated ${vsBudPct}%`,
              confidence: 0.5,
            })
        }

        if (act !== undefined) {
          if (CHANNELS.includes(label)) channelRows[label] = act
          else if (TOTAL.includes(label)) {
            totalRow = act
            totalLabel = row.label
          }
        }
      }

      // Check 3: channels sum to Total.
      const sum = Object.values(channelRows).reduce((a, b) => a + b, 0)
      if (totalRow !== undefined && Object.keys(channelRows).length >= 2) {
        checks++
        if (Math.abs(sum - totalRow) <= Math.max(2, Math.abs(totalRow) * 0.02)) passed++
        else
          flags.push({
            sourcePage: page.sourcePage,
            field: `${table.title} · ${totalLabel}`,
            issue: `channel sum ${sum} ≠ stated total ${totalRow}`,
            confidence: 0.4,
          })
      }
    }

    // Surface anything the extractor itself couldn't read.
    for (const u of page.unreadable ?? [])
      flags.push({ sourcePage: page.sourcePage, field: "unreadable", issue: u, confidence: 0.2 })
  }

  return { flags, checks, passed }
}
