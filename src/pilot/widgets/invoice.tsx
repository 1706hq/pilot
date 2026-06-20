"use client"

/**
 * Invoice widget — a clean, light "paper" preview that contrasts with the dark
 * dashboards, plus a working Download PDF button (react-pdf, loaded on demand).
 */

import { useState } from "react"

import { downloadBlob } from "~/pilot/pdf/download"
import { computeInvoice, money } from "~/pilot/widgets/invoice-calc"
import type { InvoiceSpec } from "~/pilot/widgets/types"

function Party({ label, name, lines }: { label: string; name: string; lines?: string[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[#9aa7bd]">
        {label}
      </div>
      <div className="text-[12.5px] font-semibold leading-snug text-[#0b1220]">{name}</div>
      {(lines ?? []).map((l, i) => (
        <div key={i} className="truncate text-[11px] leading-relaxed text-[#5b6b82]">
          {l}
        </div>
      ))}
    </div>
  )
}

export function InvoiceCard({ spec }: { spec: InvoiceSpec }) {
  const { currency, items, subtotal, tax, total } = computeInvoice(spec)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const { renderInvoicePdf } = await import("~/pilot/pdf/invoicePdf")
      const blob = await renderInvoicePdf(spec)
      downloadBlob(blob, `${(spec.number || "invoice").replace(/[^\w-]/g, "_")}.pdf`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[invoice] pdf failed", err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="h-1.5 bg-gradient-to-r from-[#2c66b8] to-[#e8893b]" />
      <div className="px-4 pb-5 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[19px] font-bold tracking-wide text-[#0b1220]">
              INVOICE
            </div>
            <div className="text-[11px] text-[#5b6b82]">{spec.number}</div>
          </div>
          <div className="text-right text-[10.5px] leading-relaxed text-[#5b6b82]">
            <div>Issued: {spec.issueDate}</div>
            {spec.dueDate ? <div>Due: {spec.dueDate}</div> : null}
          </div>
        </div>

        {/* Parties */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Party label="From" name={spec.from?.name ?? ""} lines={spec.from?.lines} />
          <Party label="Bill to" name={spec.to?.name ?? ""} lines={spec.to?.lines} />
        </div>

        {/* Items */}
        <table className="mt-5 w-full table-fixed border-collapse text-[11px]">
          <colgroup>
            <col />
            <col className="w-8" />
            <col className="w-[68px]" />
            <col className="w-[72px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#0b1220] text-[8.5px] uppercase tracking-wide text-[#9aa7bd]">
              <th className="pb-1.5 text-left font-medium">Description</th>
              <th className="pb-1.5 text-right font-medium">Qty</th>
              <th className="pb-1.5 text-right font-medium">Unit</th>
              <th className="pb-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-[#f0f2f6] align-top">
                <td className="py-1.5 pr-2 text-[#0b1220]">{it.description}</td>
                <td className="py-1.5 text-right tabular-nums text-[#5b6b82]">{it.quantity}</td>
                <td className="py-1.5 text-right tabular-nums text-[#5b6b82]">
                  {money(Number(it.unitPrice) || 0, currency)}
                </td>
                <td className="py-1.5 text-right tabular-nums font-medium text-[#0b1220]">
                  {money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-3 flex justify-end">
          <div className="w-[62%] text-[11.5px]">
            <div className="flex justify-between py-0.5 text-[#5b6b82]">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(subtotal, currency)}</span>
            </div>
            {tax > 0 ? (
              <div className="flex justify-between py-0.5 text-[#5b6b82]">
                <span>VAT ({spec.taxRate}%)</span>
                <span className="tabular-nums">{money(tax, currency)}</span>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between border-t border-[#0b1220] pt-1.5 text-[14px] font-bold text-[#0b1220]">
              <span>Total</span>
              <span className="tabular-nums">{money(total, currency)}</span>
            </div>
          </div>
        </div>

        {spec.notes ? (
          <div className="mt-4 text-[10.5px] leading-relaxed text-[#5b6b82]">
            <span className="font-medium uppercase tracking-wide text-[#9aa7bd]">
              Notes&nbsp;
            </span>
            {spec.notes}
          </div>
        ) : null}

        {/* Download */}
        <button
          type="button"
          data-click-effect
          onClick={handleDownload}
          disabled={downloading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b1220] py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#1b2740] active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14" />
          </svg>
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
    </div>
  )
}
