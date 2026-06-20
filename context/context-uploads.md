# Context uploads — "Add context"

Lets Peter upload files that PILOT can reference in **every future
conversation** (voice and text).

## UI

A square **"+" tile** in the **bottom-left** of the left sidebar (same size/radius
as the CREW cards; subtle grey; expands to "Add context · N files" on hover). It
opens a file picker. On upload, a banner confirms *"Added N files to PILOT's
context"* (and notes any skipped images).

## Storage (`src/pilot/storage/context.ts`)

- Files are stored in **`localStorage`** under `pilot.context.v1`. This persists
  in **both** the browser and the Tauri (macOS) webview — no native/disk APIs
  needed — so uploads survive across launches.
- **Images are rejected.** Text-like files (`.txt .md .csv .json .html .xml`
  + code, etc.) have their text stored. Other binaries (PDF/docx) keep metadata
  only — **their contents are NOT extracted** (see TODO below).
- Per-file cap ~60k chars; prompt budget ~16k chars.

## How PILOT reads it

- **Text path:** `getContextText()` is injected into the system prompt on every
  message (`buildSystemPrompt(agent, getContextText())`), so PILOT always sees
  current uploads. Verified live.
- **Voice path:** three mechanisms (because the session auto-connects at boot,
  *before* later uploads exist):
  1. `context` dynamic variable at `startSession` (files present before connecting).
  2. **Live push** — on upload, if a session is active, `voiceBridge.sendContextualUpdate(...)`
     injects the new files straight into the live conversation. `voiceBridge`
     (`voice/voiceBridge.ts`) exists because the upload button lives outside the
     `<ConversationProvider>`.
  3. **`read_context` client tool** — PILOT can pull the current files on demand
     mid-conversation; it reports files even when they're a PDF it can't read
     (so it never wrongly says "no files" when files exist).

## Known issue / TODO

The original "PILOT can't see my files" bug was the voice timing above (now
fixed). The remaining limitation: **PDF / Word docs aren't text-extracted** — to
support them, add client-side extraction (e.g. `pdf.js` for PDFs, `mammoth` for
docx) inside `addContextFiles`, then store the extracted text the same way.
