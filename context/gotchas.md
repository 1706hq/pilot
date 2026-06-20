# Gotchas — non-obvious things

Read this before changing the corresponding areas; each of these caused a real bug.

## Orb (`src/components/orb/Orb.tsx`)
- The shader's `useEffect` re-inits WebGL on dep changes. The animatable values
  (`hue`, `hoverIntensity`, `forceHoverState`, `spinSpeed`, `backgroundColor`) are
  read from **refs** inside the rAF loop and **lerped**, so `pilotState` changes
  animate smoothly with **no teardown**. **Do not** add them back to the effect
  dep array.
- `.orb-container` needs `min-width:0; min-height:0` (it's a flex/grid item;
  otherwise `min-*:auto` resolves to the canvas's intrinsic size and it won't
  shrink). A **ResizeObserver** drives the canvas resize so the orb shrinks to a
  top "presence" when a chat starts.

## Sidebar (`src/components/ui/sidebar.tsx`)
- Has `side` ("left"|"right"), `widthOpen`, `widthClosed` props. Left collapsed
  width is 80, right output panel opens to 440. The right panel force-opens when
  it has widgets.

## Composer / vanish input (`placeholders-and-vanish-input.tsx`)
- The Aceternity pixel-dissolve is **disabled** via the `disableVanish` prop (set
  in `reference-composer.tsx`) — the input just clears on submit. There's also a
  controlled-value clear path; it must NOT clear mid-animation or it wipes the
  dissolve's pixel buffer (only relevant if vanish is ever re-enabled).
- `onSend` is the hook into the orchestrator; the send button and Enter both submit.

## ElevenLabs SDK (`@elevenlabs/react`)
- It's the **provider-based** API (NOT `useConversation({clientTools})`). Wrap in
  `<ConversationProvider>`; use `useConversationControls/Status/Mode` +
  `useConversationClientTool`. See [voice.md](voice.md).
- Updating the agent: **minimal deep-merge PATCH** only (full config 400s); arrays
  (e.g. `prompt.tools`) **replace** — send the whole array.
- `voiceBridge.ts` exists so code outside the provider (the sidebar upload) can
  call `sendContextualUpdate` on the live session.

## react-pdf (`pdf/invoicePdf.tsx`)
- **Dynamically import** `@react-pdf/renderer` inside the download handler — never
  at module top (keeps it out of the bundle / avoids SSR + Turbopack issues). Uses
  built-in Helvetica (no font files to bundle).

## Wake word (`useWakeWord.ts`)
- Browser **Web Speech API** → works in Chrome, **dead in macOS WKWebView**. The
  native app relies on voice **auto-connect** + push-to-talk instead.

## Launch / layout (`page.tsx`)
- Staged reveal via `useLaunch()` phase (0→3): aurora → orb → everything. The
  choral pad (`launch/launchSound.ts`) is procedural Web Audio (no asset).
- Voice **auto-connects** ~600ms after phase 3 (guard with a ref so it fires once;
  don't depend on the `voice` object identity in the effect or it churns).
- The composer's border-glow sweep is gated until after the prompt bar fades in.
- The transcript scroll area is height-bounded (`top-[176px] bottom-[152px]`); the
  inner `Transcript` is `h-full overflow-y-auto` so it scrolls **within** itself
  and never under the composer.

## Model / OpenRouter
- Model default `google/gemini-3.5-flash` (full "gemini-3.1-flash" isn't on
  OpenRouter). Keep tool args **flat** and validate/coerce model JSON
  (`canvas.ts` `coerce`) — Gemini tool-calling can be loose.

## Dates / runtime
- The app uses `new Date()` / `Math.random()` freely at runtime (fine in the app).
  These are only forbidden inside **Workflow scripts**, not app code.

## Secrets
- `.env.local` is gitignored. Don't hardcode keys in committed files. (The
  agent-patching scripts that inlined the key were one-off Bash, not committed.)
