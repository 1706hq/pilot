# Canvas & widgets — "make any UI"

PILOT renders UI on the fly into the right-hand **canvas** (the Output sidebar).
The headline capability: he picks the *right* artefact for the request — an
invoice, a document/report, a dashboard, or a single chart/table — not always a
dashboard.

## The flow

1. User asks (voice or text): "draft an invoice for Acme £5k…", "write me a brief
   on…", "show American Golf's KPIs".
2. **Voice:** the agent calls the `show_on_canvas(intent)` client tool.
   **Text:** the orchestrator's tool-calling loop calls the same `show_on_canvas` tool.
3. Both route to `paintCanvas(intent)` (`src/pilot/agents/canvas.ts`), which:
   - calls `generateCanvas(intent)` → Gemini returns a typed JSON widget spec
     (the prompt makes the model choose the type),
   - validates/coerces it,
   - attributes it to a CREW member (invoice→STERLING, dashboard/chart→MARSHALL, else PILOT),
   - pushes it to the `widgets` store → `WidgetRenderer` displays it,
   - shows a task chip in the left feed (working → done),
   - returns a short spoken line for PILOT to confirm.

The model **never emits code** — only typed JSON specs mapped to vetted React
components (no eval / injection surface).

## Widget vocabulary (`src/pilot/widgets/types.ts`)

`WidgetBody` =
- `invoice` — clean light-"paper" card + **Download PDF** (the star feature)
- `document` — prose/report/brief card (markdown body)
- `dashboard` — titled grid of inner widgets
- inner widgets: `stat` (KPI card), `chart` (pure-SVG line/bar), `table`,
  `link`, `file`

Each is stamped with `{ id, agent, createdAt }` on arrival.

## Invoice (the showcase)

- **Spec:** `number, issueDate, dueDate?, currency, from{name,lines}, to{}, items[{description,quantity,unitPrice}], taxRate?, notes?`.
- **Preview:** `widgets/invoice.tsx` — white paper card with a blue→orange accent
  bar, FROM / BILL-TO, a fixed-layout items table (Description/Qty/Unit/Amount),
  Subtotal / VAT / **Total**, notes, and a dark **Download PDF** button. Totals
  computed in `invoice-calc.ts`.
- **PDF:** clicking download dynamically imports `pdf/invoicePdf.tsx`
  (`@react-pdf/renderer`, Helvetica, A4) → `renderInvoicePdf(spec)` → Blob →
  `downloadBlob()`. Verified to produce a valid `%PDF-` file. The library is
  **dynamically imported** so it stays out of the main bundle and never SSRs.
- Rendered **without** the dark frame (the white paper stands on its own).

## Document

`widgets/document.tsx` — title + subtitle + markdown body (`##` headings,
`**bold**`, `*` bullets). Used for briefs, reports, memos, plans.

## Dashboard / charts

`WidgetRenderer.tsx` lays a dashboard out as a 2-col grid; charts/tables/files
span full width. Charts are **pure SVG** (`charts.tsx`) animated with motion —
no chart library.

## Text-path tool-calling (`orchestrator.ts`)

The text orchestrator streams from OpenRouter with the `show_on_canvas` tool and
`tool_choice: "auto"`, in a loop (max 5 turns): it parses streamed `tool_calls`,
runs `paintCanvas`, feeds results back, and the next turn streams PILOT's spoken
confirmation into the same bubble. While a tool runs (no text yet) the bubble
shows the thinking-dots loader.

## Extending — adding a new widget type

1. Add the spec to `widgets/types.ts` (`WidgetBody` union).
2. Build the renderer component; wire it into `WidgetRenderer.tsx`.
3. Add it to the generator schema/coercion in `canvas.ts` so Gemini can produce it.
4. (Optional) mention it in the `show_on_canvas` tool/agent descriptions.
