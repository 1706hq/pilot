# Product — what PILOT is

## The concept

**PILOT** — *Peter's Intelligent Life Operating Terminal* — is a personal AI
command centre for **Peter Jones CBE** (the Dragons' Den investor). Think Tony
Stark's J.A.R.V.I.S., but for a man who runs 25+ portfolio companies, a personal
brand, and a family office instead of one suit.

PILOT does **not** replace Peter's judgement — it eliminates everything that
wastes it. Every morning it surfaces only what needs a decision; across the day
it answers questions, pulls up numbers, and produces things (invoices, briefs,
dashboards) on demand.

## Who it's for

Built for **Peter Jones** specifically. The persona knows him deeply — his
rise-fall-rise story, Dragons' Den, his portfolio, his quirks (the bright socks),
his dyslexia (so: speak, don't wall-of-text). Full dossier in
[peter-jones.md](peter-jones.md) and `src/pilot/agents/peter-jones.ts`.

He's addressed as **"boss"** (occasionally "Peter").

## The CREW (agents)

PILOT is the orchestrator. Behind it is the **CREW** — specialist agents. v1
ships two as the visible roster:

- **STERLING** — CFO / finance (cash, P&L, **invoices**). Teal accent.
- **MARSHALL** — COO / operations (KPIs, **dashboards**, board packs). Lime accent.

Agents are **personas, not separate processes** — same model + tool layer, an
`agent` label flows through messages/tasks/widgets for attribution and colour.
(The ElevenLabs "Canvas" agent internally uses a different CREW naming —
CAPITAL/COMPASS/COUNSEL/etc. — which is mapped onto STERLING/MARSHALL for the UI.)

## Design intent

- **Vibe-first.** The success metric is that it *feels* like Jarvis — premium,
  low-latency, alive. Visuals (the OGL Orb, DarkVeil shader background, glowing
  borders, the launch sequence) matter as much as function.
- **Voice-first.** The primary interaction is talking. Text is the secondary path.
- **Surfaces decisions, not data.** PILOT reads everything and surfaces what matters.
- **Renders UI on the fly.** Answers don't have to be text — PILOT builds an
  invoice / dashboard / document into the canvas when that's the better answer.

## Decisions locked early

- Two agents for v1: STERLING + MARSHALL.
- LLM: **Gemini 3.5 Flash via OpenRouter** (full "gemini-3.1-flash" isn't published).
- Voice: **ElevenLabs Conversational AI**.
- Local-first: context/files stored on-device (localStorage), no external DB.
- Out of scope (v1): MCP integrations (Shopify/GA), computer-use/cursor control.
