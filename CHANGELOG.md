# PILOT changelog

Notes for the team on what shipped in each release. Newest first.

## v0.4.2 — comprehensive accuracy, charts & upload pass (+ a test safety net)

A full review of every key area, with fixes verified by an automated test suite and a CI gate that now runs on every push (so regressions are caught before release, not by Peter).

- **Safety net**: Vitest suite covering the failure classes that kept biting (retrieval/company scoping, unit resolution, validation flags, chart formatting, column classification, source verification); a CI workflow runs typecheck + tests + build on every push and PR.
- **Accuracy**: word-boundary column matching shared by consolidate and verify, so a month column ("July") is no longer read as year-on-year and a bare "Budget %" is no longer read as a variance; the headline value prefers an explicit Actual column and lowers confidence when it has to guess; year-on-year (vsLY) figures are no longer dropped from chat answers.
- **Charts**: now show real Y-axis values and per-bar labels formatted as number/currency/percent (they previously showed no numbers at all); negative values (declines, under budget) render correctly from a zero baseline; the "from your upload" badge is verified against documents we actually hold.
- **Voice**: answers then waits — no more asking Peter questions during silence (server-side turn-taking + prompt).
- **Uploads**: pages/sheets that can't be read are counted and surfaced ("X parts couldn't be read") instead of presenting partial data as complete; a global queue processes one document at a time so dropping several files doesn't trip rate limits; legacy .doc is called out clearly; file pickers filter to supported types.

## v0.4.1 — hotfix: restore data retrieval (regression in v0.4.0)

v0.4.0's new company scoping had a matching bug that made PILOT act as if it had no data. When a question named a company we DO hold (e.g. "how is American Golf doing?"), the scope filter compared the canonical name "american golf" against the stored company field "American Golf (AGT)" with an exact match, which never matched, so it filtered the data out and PILOT said it had nothing. Any query naming American Golf (and any freshly uploaded company, once named) hit this.

- **Fix**: both the query and each KB's company field now resolve through the same `canonicalCompany` mapping (alias + substring), so "American Golf (AGT)" and "how's American Golf?" both resolve to the same company and match.
- The original guard is intact: a company we genuinely have no data for (e.g. Jessops) still correctly returns nothing, so PILOT says it doesn't have the latest rather than borrowing another company's figures.
- Verified against the real seed: American Golf and the AGT alias return data, Jessops returns none, a generic summary returns everything. Fixes chat and voice (both share this retrieval).

## v0.4.0 — reliability, accuracy + HUD (Peter's 27 Jun feedback)

The big one. Addresses Peter's 27 June notes end to end, plus the mobile/web and sync groundwork.

- **Reliability** — every OpenRouter call (reading documents, analysis, the Runway, chat) now goes through one resilient layer with a timeout and automatic retry/backoff on transient failures (429/5xx/network). This is what was causing "BLACKBOX failed", silently dropped pages (wrong numbers) and "the system timed out, try again". The upload pipeline is now best-effort: a wobble at the final analysis step never throws away a fully-read document. Chat shows a warm "connection hiccuped, give it another go" instead of a raw error.
- **Accuracy** — retrieval is company-aware, so one company's figures never bleed into a question about another. The system prompt names exactly which companies have verified data and tells PILOT to say it doesn't have the rest yet, never to borrow another's numbers.
- **Greeting** — now tracks the time of day (was frozen at launch, reading "Good morning" all evening).
- **HUD** — the orb is the hero: large and centred, scaling up on a full screen, greeting directly beneath it. Layout pivot raised so the wordmark never clips the radar headings; clean vertical stack below it. The Runway is collapsed by default, opens when PILOT builds something, and has a deliberate open/close toggle with a count.
- **Mobile + sync + gate** — responsive layout, a one-blob cross-device sync store, and a passcode gate for the hosted web build (groundwork for the mobile version).

## v0.3.2 — correct financial value types + validation

Peter was seeing some numbers misread. Deep dive into BLACKBOX found and fixed it:
- **Unit handling**: `consolidate` no longer defaults a missing unit to `£k`. Counts (transactions, subscribers) and per-item money (ATV, ASP, ARPU) were being presented as money in thousands; `resolveUnit()` now infers honestly and leaves unknowns as plain numbers.
- **Bad seed data dropped**: two engine-extracted KPI trackers had misread values (e.g. £455m weekly net sales) and value-types mislabelled as dimensions. Removed; the clean Trade Pack + New(1) cover American Golf accurately.
- **`validate.ts`**: flags and lowers confidence on percentages that look like fractions, implausibly large `£k` figures, and value-type-as-dimension labels (honesty trail, never a silent rewrite).
- **Prompts**: a percentage "42%" is 42 not 0.42; counts and per-item money are plain numbers, never `£k`.
- Verified end-to-end on a Truly-style KPI spreadsheet. Known follow-up: pivot-aware consolidate for value-types-as-rows trackers.

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
