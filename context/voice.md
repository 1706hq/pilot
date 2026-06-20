# Voice — ElevenLabs Conversational AI

## Overview

Voice is the primary interaction. It uses **ElevenLabs Conversational AI** via
`@elevenlabs/react`. The session **auto-connects ~600ms after launch** (once the
UI has revealed), so Peter can just talk — the orb/mic also toggle it.

The agent and its client tools are the bridge between speech and the app: the
agent decides *when* to render UI / read context, and the client tools (in
`usePilotVoice.ts`) do it locally — same actions as the text path.

## The agent

- Agent: **"PILOT — Canvas"**, id `agent_5801kvdenajhens9ppvp0xvyd8yp`
  (on the ElevenLabs account behind the key in `.env.local`).
- It was pre-built and then enriched via the API (personality + Peter Jones
  dossier appended to the system prompt; `first_message` set to `{{greeting}}`).
- Voice id `JBFqnCBsd6RMkjVDRZzb`, LLM gpt-4.1-mini (server-side, ElevenLabs).

### Client tools (must match names in `usePilotVoice.ts`)

| Tool | Args | Handler |
|---|---|---|
| `show_on_canvas` | `intent` (string) | `paintCanvas(intent)` → generates + renders a widget (invoice/document/dashboard/chart) |
| `live_search` | `query` | `quickLine(query)` → one-line answer (LLM; no real web yet) |
| `crew_working` | `agent` (CAPITAL/COMPASS/…) | lights a task chip in the left feed |
| `read_context` | — | returns the current uploaded files + text (always fresh) |

### Dynamic variables (passed at `startSession`)

- `greeting` — a witty, varied spoken opener from `pickVoiceGreeting()` (so he
  never opens the same way; never the old "three things…"). The agent's
  `first_message` is literally `{{greeting}}`.
- `context` — a truncated dump of uploaded files (fast path for files present
  before connecting). Both have safe placeholder defaults set on the agent.

## SDK specifics (important)

`@elevenlabs/react` here is the **newer, provider-based SDK** — not the old
`useConversation({clientTools})` hook. So:

- Wrap the subtree in **`<ConversationProvider>`** (done in `page.tsx`).
- Inside, use `useConversationControls()` (startSession/endSession/sendContextualUpdate),
  `useConversationStatus()`, `useConversationMode()` (isSpeaking), and register
  tools with `useConversationClientTool(name, handler)`.
- Private agents need a **conversation token**: `GET /v1/convai/conversation/token?agent_id=…`
  with the `xi-api-key` header (works from the browser — no CORS issue). Then
  `startSession({ conversationToken, connectionType: "webrtc", dynamicVariables })`.

## Updating the agent via API

Use a **minimal deep-merge PATCH** — sending the full `conversation_config` back
returns 400. Send only the changed sub-tree, e.g.
`{"conversation_config":{"agent":{"first_message":"…","prompt":{"prompt":"…","tools":[…]}}}}`.
Note: **arrays replace, not merge** — when changing `prompt.tools`, send the full
array (fetch existing, append, send all). See the patch scripts referenced in
git history / `gotchas.md`.

## Wake word — "Hey PILOT"

`useWakeWord.ts` is an always-on listener using the browser **Web Speech API**.
It works in **Chrome** but **NOT in the macOS WKWebView** (the packaged app), so
in the desktop build it does nothing — voice there relies on auto-connect +
push-to-talk. To make "Hey PILOT" work natively, swap the engine for an
on-device WASM one (**sherpa-onnx** or **Picovoice Porcupine**) behind the same
interface. With auto-connect on, the wake word is largely redundant anyway (the
session is already live and listening).

## Mic / errors

- Mic permission: native app needs `NSMicrophoneUsageDescription` (in
  `src-tauri/Info.plist`). Browser prompts on first use.
- Failures surface in the on-screen **VoiceBanner** ("Microphone blocked…",
  "Connecting…", "Couldn't connect: …") — never silent.
