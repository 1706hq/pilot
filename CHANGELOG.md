# PILOT changelog

Notes for the team on what shipped in each release. Newest first.

## v0.3.1 — UI cleanup + restrained voice (Peter feedback)

- **Contained the orb/radar** so the rings no longer bleed into the greeting above or the readings below; re-spaced the resting screen.
- **Landscape pivot**: on wide windows the home now pivots to orb + greeting on the left and the RADAR readings as a column on the right; clean stack on narrow.
- **Draggable window**: added a top drag strip (`data-tauri-drag-region`) so the window moves like any mac app, inset to keep the traffic lights and menu clickable.
- **Restrained voice**: ready-and-wait spoken openers, and the ElevenLabs agent now says its opening line then waits, never volunteering a briefing or company data on connect unless asked (greeting in `greetings.ts`; agent prompt patched server-side).

## v0.3.0 — upload accuracy across all file types + RADAR

The theme: make Peter's own report uploads as accurate as the pre-seeded data, give him clear feedback while they process, and add proactive intelligence.

**Upload now runs the full BLACKBOX pipeline for every report type.**
Previously only PDFs got the grounded, page-cited treatment; Excel and Word fell back to a raw, truncated text dump (this caused Peter's "Truly Excel reports wrong numbers" bug). Now:
- **PDF** — render to page images, vision-read each page (`extractPage`, `render.ts`).
- **Excel / CSV / TSV** — parse each sheet to CSV, transcribe with `extractSheet` (`ingestSpreadsheet`).
- **Word (.docx)** — extract text via mammoth, chunk it, transcribe figures + key statements with `extractDocChunk` (`ingestTextDocument`).
All three feed the identical audit → consolidate → analyse → critique → store stages and produce the same `KnowledgeBase`, so retrieval, RADAR, the Runway and voice all use them with citations. Routing is in `src/pilot/storage/context.ts` (`pdfQueue` / `sheetQueue` / `docQueue`).

**Upload status UI** (`src/components/home/upload-status.tsx`).
A live toast per upload showing the lifecycle (Uploaded → Reading N/M → Checking → Analysing → Ready: K figures, or an error with a retry hint), a progress bar and a rough time estimate. Backed by a new `Ingest` model + store slice (`startIngest` / `updateIngest` / `removeIngest`).

**File limits.** 25MB cap with a friendly reject message; the Add-files hint now states what's supported ("PDF, Excel or Word, up to 25MB"). See `MAX_FILE_BYTES` / `SUPPORTED_HINT` in `context.ts`.

**RADAR — proactive intelligence** (`src/pilot/radar/radar.ts`, `src/components/home/radar-panel.tsx`).
Reads across everything analysed and surfaces the non-obvious: classified as **turbulence** (risk), **tailwind** (opportunity) or **signal** (worth a look), each grounded with a source page and tappable to explore. `generateRadar()` is one model call over the cross-document insights, cached per data signature; a strong bundled default makes first open instant, then it regenerates when new data is analysed. Replaces the Today's Brief panel on the home. Plus a few everyday exec starter prompts.

**Docs.** `context/ingestion-railway.md` — the build brief for the future email → Railway → PILOT ingestion (a later product step, not in the prototype).

### Known follow-ups (not blocking the demo)
- Minor cosmetic: the extractor occasionally tags a non-money row (e.g. "runway months") as £k. Values are correct and the chat phrases them right; a deterministic cleanup is in `extractSheet`, could extend to docs.
- A *new* file for a company already loaded (different filename) creates a second record rather than replacing last week's. Fine for the prototype; the "replace previous for this company" logic is specced in the ingestion brief.
- In-app uploads persist in localStorage (a few MB ceiling); it now warns on quota. A real store (SQLite via Tauri) is a later step.
- Voice live mic round-trip needs a quick test on the installed Mac app (could not be tested headless).

## v0.2.9 — pre-seeded data, web search, voice/text parity

- **Pre-seeded knowledge base**: four analysed American Golf documents (incl. the 105-page trade pack, ~1,870 grounded figures) bundled so PILOT knows them on first open, no upload needed (`src/pilot/analyst/seed.json`).
- **Live web search**: `web_search` tool (text) + `live_search` (voice) via OpenRouter's web plugin (`src/pilot/agents/web.ts`); the persona states PILOT can access the web for public data.
- **Voice / text data parity**: voice `query_data` tool calls the same `retrieveContext` as text; ElevenLabs agent updated (tool + accuracy override) so spoken questions hit the same grounded data.
- **BLACKBOX-grounded Runway**: charts, dashboards, emails and reports build from the real, cited figures.
- **Live Today's Brief** from BLACKBOX insights.
- **Fixes**: `retrieveContext` crash on insights missing citations (was hanging all chat); reasoning-model tool-loop that left empty replies.
