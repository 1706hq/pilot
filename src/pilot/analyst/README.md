# BLACKBOX — the data-analyst ingestion engine

Turns dense, image-heavy trade packs (e.g. the 105-page FY27 Wk19 American Golf
pack) into a **grounded, cited knowledge base** that STERLING/MARSHALL read from
at conversation time. Accuracy is the #1 requirement; it's allowed to take
minutes, and it checks its own work.

## Why this exists (proven, not assumed)
Naive PDF→text destroys these documents: it flattens tables, mis-signs
parentheses-negatives, loses chart images, and blends the four grains
(Last Week / MTD / N6W / FY forecast).

**Validation (page 11, "Last Week – AGT Dashboard"):**
- Real pixels — Retail: Bud `2,558`, ACT `2,115`, vs Bud `(443)`, vs Bud `(17.3%)`, vs LY `(539)`, LFL `(20.7%)`.
- Vision extraction (gemini-2.5-pro, temp 0, JSON) returned **exactly** that, parentheses correctly negated, units tagged, columns + grain correct.
- It reconciles: `2115+694+35 = 2844 = Total AGT`; `−443/2558 = −17.3%`.
- The PDF **text layer** reported the same variance as `(15%)` — **wrong**. That delta is the whole case for BLACKBOX.

## Locked decisions
- **Vision model:** `google/gemini-2.5-pro` for extraction + audit (strongest available; accuracy > cost > speed). Chat can stay on the cheaper model.
- **temperature 0** for extract / audit / self-critique.
- **Every number carries `sourcePage` + unit + grain; every insight cites the records it's built on.** No citation → not used. If it's not in the doc, say so.

## Pipeline (map-reduce, one small checkable task per page)
0. **render** — PDF page → high-res PNG (pdf.js in the webview; verify in WKWebView). ~200 dpi was enough for the small table text.
1. **extract** ✅ *(this commit)* — per-page faithful transcription → `ExtractedPage`. Validated.
2. **audit** — second vision pass re-reads the page vs Stage-1 JSON; per-field confidence + arithmetic reconciliation (subtotals=totals, Act−Bud=variance, %=var/bud). Flags, never smooths.
3. **consolidate** — merge pages → `LedgerRecord[]` + `NarrativeItem[]` + `FeedbackItem[]` + `Entity[]`, deduped across grains.
4. **analyze** — CFO/COO reasoning **over the ledger only**, never the PDF: layered summary, ranked (incl. non-obvious) insights, risks/opps with £ magnitude, anticipated-Q&A bank. Every claim cited.
5. **critique** — self-review vs the ledger; remove anything unsupported/contradictory. Mandatory.
6. **store** — persist the KB (localStorage JSON v1; SQLite via Tauri if size bites), keyed doc→company→period; fast to query.

## Phasing
- **Phase 1 (accuracy):** render → extract → audit → consolidate → store. Verify figures + reconciliation against the real pack **before** any analysis.
- **Phase 2 (reasoning):** analyze → critique → wire retrieval into STERLING/MARSHALL (answer from the KB with citations; never re-read the PDF; say "not in the document" otherwise).

## Wiring (Phase 1 tail)
- Hook `addContextFiles` (`storage/context.ts`): a PDF/PPTX kicks off BLACKBOX as a background job. **All context uploads route through this**, replacing the naive text path.
- Progress in the Tasks feed: "BLACKBOX · extracting 34/105", "auditing", "analysing", "checking itself".

## Status
- ✅ Foundation de-risked on the real pack (render + vision extraction + reconciliation; text-dump shown wrong).
- ✅ `types.ts` (data model) + `extract.ts` (validated Stage 1).
- ⏳ Next: `render.ts` (webview pdf.js), `verify.ts` (audit), `consolidate.ts`, `store.ts`, upload wiring — then Phase 2.

Branch: `connor/blackbox`. Never push to main directly.
