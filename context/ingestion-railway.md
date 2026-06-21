# PILOT — weekly email ingestion (build brief for Connor)

## What we're building

Peter's team already emails their reports around. We want those reports to flow into PILOT automatically, get fully analysed by BLACKBOX, and show up in his app, without him uploading anything and without relying on his app being open.

The plan: their reports get forwarded to our Gmail (pilotdata@1706.ai). A back office agent on Railway reads that inbox on a schedule, runs each new report through the BLACKBOX analysis pipeline, and publishes the finished knowledge file. PILOT then pulls that in when Peter opens it.

## How it flows (in order)

1. Peter's team emails reports to data@pjinvestmentgroup.com (their address, nothing changes for them).
2. Kris forwards data@ to pilotdata@1706.ai (our Gmail). His only job, one forwarding rule.
3. Our Railway agent reads pilotdata@1706.ai on a weekly cron.
4. For each new report it runs the full BLACKBOX pipeline (below) and produces a knowledge file.
5. It publishes that behind a private endpoint.
6. PILOT fetches the latest on launch and merges it into its store.
7. Peter asks, by voice or text, and gets grounded, page cited answers plus charts and docs on the Runway.

## The Railway agent

A scheduled worker (weekly cron, plus a manual trigger for testing).

1. Read the inbox. Connect to pilotdata@1706.ai over IMAP using a Google app password (held in Railway env vars). Pull messages since the last run. Extract attachments, PDF first, PPTX and XLSX later. Track processed message ids so nothing is analysed twice. Move handled mail to a Processed label, anything that fails to a Failed label.

2. Run BLACKBOX on each document (the analysis pipeline, below).

3. Label it. Set company and period from the filename, subject, or the document itself. For now it is American Golf weekly packs. Use a STABLE id per recurring report, for example "American Golf Weekly Trade Pack", not the dated filename, so each week's analysis cleanly replaces last week's, with the week held in the period field.

4. Publish. Store the produced knowledge files and serve them on one private endpoint, for example GET /knowledge, behind a bearer token. It carries Peter's financials, so token only, never public.

## The BLACKBOX pipeline (reuse the existing code in src/pilot/analyst)

The logic already exists and is proven. Lift it to run in Node on the server. Only two pieces need changing, the rest moves across as is.

1. Render. Turn each PDF page into an image. The app version uses the browser (pdf.js plus canvas). On the server, swap in a server renderer (pdftoppm from poppler, or pdfium, or the pdf-to-img package with napi-rs canvas). This is the one real porting job. Reference: render.ts.

2. Extract, per page. One vision call per page image, faithful transcription only, never interpret. Reference: extract.ts. Move the API key from the app store to a Railway env var. Model and prompt below.

3. Audit and reconcile. Arithmetic checks and confidence flags. Pure, lifts straight over. Reference: verify.ts.

4. Consolidate. Normalise into the ledger, narrative, feedback and entities. Pure. Reference: consolidate.ts.

5. Analyse. Produce the executive summary, ranked insights and pre answered Q&A, every claim cited to a page. Reference: analyze.ts. Prompt below.

6. Self critique. An auditor pass that strips anything not traceable to the ledger. Reference: analyze.ts (critique). Prompt below.

7. Assemble. One knowledge file per document, matching the schema in src/pilot/analyst/types.ts exactly. That schema is the contract between the agent and the app, so keep it identical. Reference: run.ts (drop the in app task UI calls, keep the orchestration).

## The prompts and models

All three stages currently use google/gemini-3.1-pro-preview via OpenRouter. Accuracy matters more than cost here, so keep a strong model. Use the exact prompts already in the repo. They are reproduced here so you have them in one place.

EXTRACTION (per page, temperature 0, JSON out):

"You are transcribing ONE page of a financial trade pack for an audit trail. Output ONLY a JSON object, no prose, no markdown fences.
ABSOLUTE RULES:
- TRANSCRIBE, do not interpret, summarise, or compute anything.
- Parentheses mean NEGATIVE: (247) becomes -247, (17.3%) becomes -17.3.
- Record the unit of every numeric cell: £k or % (or null if neither).
- Preserve the exact column meaning (Bud / ACT / vs Bud / vs Bud % / vs LY / LFL% etc.).
- If a cell or chart value is illegible, set its value to unreadable, NEVER invent it.
- Capture the page grain/period if the title states it (Last Week, MTD, N6W, FY forecast)."
Then it returns a fixed JSON shape (sourcePage, pageType, grain, pageTitle, tables, narrative, charts, unreadable). Full shape is in extract.ts.

ANALYSIS (over the consolidated ledger only, temperature 0.2, JSON out):

"You are a CFO/COO analysing a GROUNDED metrics ledger for Peter Jones. Each row is already verified and tagged with its source page. Reason ONLY over the ledger. Do NOT invent or estimate any figure. Every claim MUST cite the source page(s) of the figures it uses. Include NON-OBVIOUS insights (ATV up but transactions down is a footfall problem not product; a multi year LFL trend is structural not a bad week; strong channel margin means accelerate). Rank insights by importance. Give a pounds magnitude where the ledger supports it. 8 to 14 insights, 8 to 12 Q&A."
Returns summary, insights (headline, detail, kind, magnitude, citations) and qa (question, answer, citations). Full shape in analyze.ts.

SELF CRITIQUE (auditor pass, temperature 0.2, JSON out):

"You are an auditor. Below is a metrics ledger (each row cited) and a draft analysis. Check every insight and Q&A answer: is each number actually present in the ledger, is every claim cited, any internal contradiction or figure not traceable to a page. Remove or correct anything unsupported. Keep only claims grounded in the ledger. Return the corrected JSON in the same shape."

## The output (the contract)

The agent produces an array of knowledge files, one per document, each with: docId, company, period, ledger, narrative, feedback, entities, summary, insights, qa, flags, builtAt. This matches src/pilot/analyst/types.ts. Do not change the shape, the app reads it directly.

## The app change (small)

On launch, PILOT fetches GET /knowledge from the Railway endpoint using its bearer token, and merges the results into the BLACKBOX store, overriding the bundled seed by docId. If offline, it keeps whatever it already has. This is the only change on the app side. Everything downstream already reads from the same store, so retrieval, the morning brief, the Runway grounding and the voice all pick it up automatically. Reference: src/pilot/analyst/store.ts (listKnowledgeBases is where the merge happens).

## Config to set up

On Railway (env vars):
- IMAP host, user (pilotdata@1706.ai) and a Google app password.
- OPENROUTER_API_KEY for the analysis (our key and budget now, not Peter's).
- A bearer token for the /knowledge endpoint.

In PILOT:
- The /knowledge endpoint URL and the bearer token, stored in config like the other keys.

Decisions to lock: weekly cron is the default (poll every few minutes instead if we want reports to land sooner); a new weekly pack replaces the previous one for that company; a Failed label plus a simple alert to us if a document will not parse.

## First version scope

Read the inbox, run the pipeline on PDFs, serve GET /knowledge, app fetches and merges. PPTX and XLSX, auto replies to senders, and faster polling can all come after.
