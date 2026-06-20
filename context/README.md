# PILOT — project context

This folder is the onboarding pack for anyone (human or AI agent) picking up the
project. Read it top to bottom; each file is self-contained.

| File | What it covers |
|---|---|
| [product.md](product.md) | What PILOT is, who it's for (Peter Jones CBE), the vision & success metric |
| [architecture.md](architecture.md) | Tech stack, full directory map, the data-flow for text / voice / canvas |
| [voice.md](voice.md) | ElevenLabs Conversational AI, the agent config, dynamic variables, client tools, wake word |
| [canvas-and-widgets.md](canvas-and-widgets.md) | The "make any UI" system: widget types, the generator, invoices + PDF, documents, dashboards |
| [context-uploads.md](context-uploads.md) | The "Add context" file-upload feature and how PILOT reads uploads |
| [setup.md](setup.md) | How to run (browser + native Mac app), env keys, icon, troubleshooting |
| [gotchas.md](gotchas.md) | Non-obvious things that will bite you if you don't know them |
| [peter-jones.md](peter-jones.md) | The Peter Jones dossier the persona is built on |

## TL;DR

PILOT ("Peter's Intelligent Life Operating Terminal") is a **Jarvis-style AI
command-centre desktop app** for entrepreneur **Peter Jones CBE**. It's a
**Tauri 2 + Next.js 16 + React 19** app. You talk to PILOT (voice via ElevenLabs,
or text), and he answers in character *and* renders UI on the fly into a right-hand
"canvas" — invoices, documents/reports, dashboards, charts.

The explicit success metric is **"vibe" and low-latency feel**, not backend
correctness or scale. It's a demo-quality product that should *feel* like Jarvis.

## Current status (June 2026)

Working & verified:
- 3-column shell (CREW + tasks left · Orb + transcript + composer centre · output canvas right)
- Animated launch sequence + choral pad; Orb reacts to state (idle/connecting/listening/speaking/thinking)
- Text chat streaming via **Gemini 3.5 Flash on OpenRouter**, with tool-calling
- Voice via **ElevenLabs** ("PILOT — Canvas" agent), auto-connects on launch
- On-the-fly UI: **invoices (with PDF download)**, documents, dashboards, charts
- File uploads → local context PILOT can read in every conversation
- Native macOS title bar + custom app icon

Known limitations / TODO:
- "Hey PILOT" wake word uses browser Web Speech — works in Chrome, **not** in the
  macOS WKWebView; needs swapping to an on-device engine (sherpa-onnx / Picovoice)
- Uploaded **PDFs/Word docs are not text-extracted** (only text-like files are read)
- Agent routing is light (widget attribution, not full intent routing)

See [the build plan](../../.claude/plans) history and the per-area docs for detail.
