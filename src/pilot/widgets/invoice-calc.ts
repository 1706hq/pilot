/** Shared invoice math + formatting, used by both the preview card and the PDF. */

import type { InvoiceSpec } from "~/pilot/widgets/types"

export function computeInvoice(spec: InvoiceSpec) {
  const currency = spec.currency || "£"
  const items = Array.isArray(spec.items) ? spec.items : []
  const subtotal = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  )
  const tax = spec.taxRate ? (subtotal * spec.taxRate) / 100 : 0
  const total = subtotal + tax
  return { currency, items, subtotal, tax, total }
}

export function money(n: number, currency: string): string {
  return (
    currency +
    n.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
