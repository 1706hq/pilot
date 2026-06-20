"use client"

/**
 * Renders an InvoiceSpec to a clean, downloadable PDF using @react-pdf/renderer.
 * The library is imported dynamically (only when a download is requested) so it
 * stays out of the main bundle and never runs during SSR. Uses the built-in
 * Helvetica family for crisp, reliable typography.
 */

import { computeInvoice, money } from "~/pilot/widgets/invoice-calc"
import type { InvoiceSpec } from "~/pilot/widgets/types"

const INK = "#0b1220"
const MUTED = "#5b6b82"
const FAINT = "#9aa7bd"
const LINE = "#e6eaf0"
const ACCENT = "#2c66b8"

export async function renderInvoicePdf(spec: InvoiceSpec): Promise<Blob> {
  const RP = await import("@react-pdf/renderer")
  const { Document, Page, Text, View, StyleSheet, pdf } = RP

  const { currency, items, subtotal, tax, total } = computeInvoice(spec)

  const s = StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingBottom: 48,
      paddingHorizontal: 48,
      fontFamily: "Helvetica",
      fontSize: 10,
      color: INK,
    },
    accentBar: { height: 6, backgroundColor: ACCENT, marginHorizontal: -48 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: 40,
    },
    title: { fontSize: 26, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
    invNo: { fontSize: 10, color: MUTED, marginTop: 4 },
    metaRight: { textAlign: "right", color: MUTED, fontSize: 10, lineHeight: 1.5 },
    parties: { flexDirection: "row", marginTop: 32 },
    party: { flex: 1, paddingRight: 16 },
    label: { fontSize: 8, color: FAINT, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
    partyName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 2 },
    partyLine: { color: MUTED, lineHeight: 1.5 },
    tableHead: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: INK,
      paddingBottom: 6,
      marginTop: 30,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: LINE,
      paddingVertical: 8,
    },
    cDesc: { flex: 1, paddingRight: 8 },
    cQty: { width: 50, textAlign: "right" },
    cUnit: { width: 80, textAlign: "right" },
    cAmt: { width: 90, textAlign: "right" },
    headText: { fontSize: 8, color: FAINT, letterSpacing: 0.5, textTransform: "uppercase" },
    totals: { marginTop: 16, flexDirection: "row", justifyContent: "flex-end" },
    totalsBox: { width: 240 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, color: MUTED },
    grandRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 8,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: INK,
    },
    grandText: { fontFamily: "Helvetica-Bold", fontSize: 14, color: INK },
    notes: { marginTop: 36, color: MUTED, lineHeight: 1.5 },
    notesLabel: { fontSize: 8, color: FAINT, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  })

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <View style={s.header}>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <Text style={s.invNo}>{spec.number}</Text>
          </View>
          <View style={s.metaRight}>
            <Text>Issued: {spec.issueDate}</Text>
            {spec.dueDate ? <Text>Due: {spec.dueDate}</Text> : null}
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>From</Text>
            <Text style={s.partyName}>{spec.from?.name}</Text>
            {(spec.from?.lines ?? []).map((l, i) => (
              <Text key={i} style={s.partyLine}>{l}</Text>
            ))}
          </View>
          <View style={s.party}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.partyName}>{spec.to?.name}</Text>
            {(spec.to?.lines ?? []).map((l, i) => (
              <Text key={i} style={s.partyLine}>{l}</Text>
            ))}
          </View>
        </View>

        <View style={s.tableHead}>
          <Text style={[s.cDesc, s.headText]}>Description</Text>
          <Text style={[s.cQty, s.headText]}>Qty</Text>
          <Text style={[s.cUnit, s.headText]}>Unit</Text>
          <Text style={[s.cAmt, s.headText]}>Amount</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={s.row}>
            <Text style={s.cDesc}>{it.description}</Text>
            <Text style={s.cQty}>{it.quantity}</Text>
            <Text style={s.cUnit}>{money(Number(it.unitPrice) || 0, currency)}</Text>
            <Text style={s.cAmt}>
              {money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), currency)}
            </Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text>Subtotal</Text>
              <Text>{money(subtotal, currency)}</Text>
            </View>
            {tax > 0 ? (
              <View style={s.totalRow}>
                <Text>VAT ({spec.taxRate}%)</Text>
                <Text>{money(tax, currency)}</Text>
              </View>
            ) : null}
            <View style={s.grandRow}>
              <Text style={s.grandText}>Total</Text>
              <Text style={s.grandText}>{money(total, currency)}</Text>
            </View>
          </View>
        </View>

        {spec.notes ? (
          <View style={s.notes}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text>{spec.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )

  return await pdf(doc).toBlob()
}
