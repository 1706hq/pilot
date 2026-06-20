# Architecture

## Stack

- **Tauri 2** (Rust shell) — desktop window, native macOS title bar, OS access.
  Frontend is a **static export** (`next.config.ts` → `output: "export"`,
  `frontendDist: "../out"`). No Next server / API routes — everything runs
  client-side in the webview. CSP is `null`, so `fetch()` to OpenRouter and the
  ElevenLabs WebRTC connection work without config changes.
- **Next.js 16** (App Router, Turbopack) + **React 19** + **Tailwind v4**.
- **motion** (Framer Motion) for animation, **OGL** for the WebGL Orb + DarkVeil shaders.
- **zustand** for state. **@elevenlabs/react** for voice. **@react-pdf/renderer** for invoices.
- **Geist** / Geist Mono fonts (next/font).

## Directory map

```
src/
  app/
    page.tsx            # The whole shell: 3 columns, launch sequence, voice auto-connect,
                        #   VoiceBanner, HomeView (orb + transcript + composer)
    layout.tsx          # fonts, TauriAppWindowProvider
    globals.css         # theme tokens + custom classes (chat-dock, model-picker-scroll, …)
  components/
    orb/Orb.tsx         # OGL shader orb (refactored: ref-driven uniforms, ResizeObserver)
    dark-veil/          # OGL shader background
    BorderGlow.jsx      # animated glowing border (used on composer + widget frames)
    ui/
      sidebar.tsx       # Sidebar primitive — has side/widthOpen/widthClosed props
      placeholders-and-vanish-input.tsx  # the composer input (vanish disabled via prop)
    home/
      agents-sidebar.tsx   # LEFT sidebar: CREW roster + live task feed + Add-context button
      output-sidebar.tsx   # RIGHT sidebar: the canvas (renders widgets)
      transcript.tsx       # chat transcript (bubbles + word-by-word text-generate reveal)
      reference-composer.tsx  # composer (mic/attach/send), wired to orchestrator + voice
      dev-state-panel.tsx  # dev-only: cycle orb states + seed demo widgets
  pilot/
    types.ts            # PilotState, AgentId, ChatMessage, Task, ContextFileMeta, PilotConfig
    state/
      store.ts          # the single Zustand store (usePilotStore) + uid()
      visuals.ts        # pilotState -> Orb/BorderGlow props
      PilotOrb.tsx      # Orb wrapper bound to pilotState
    agents/
      agents.ts         # AGENTS roster metadata (names, accents, monograms)
      personas.ts       # system prompts (PILOT_CORE + STERLING/MARSHALL) + buildSystemPrompt
      peter-jones.ts    # the PJ dossier (embedded in prompts)
      orchestrator.ts   # TEXT path: streaming chat + tool-calling loop (OpenRouter)
      canvas.ts         # generateCanvas (picks widget type) + paintCanvas + quickLine
    widgets/
      types.ts          # widget spec union: stat/chart/table/link/file/dashboard/invoice/document
      WidgetRenderer.tsx# maps spec.type -> component, wraps in glowing frame
      cards.tsx, charts.tsx       # stat/link/file/table cards; pure-SVG line/bar charts
      invoice.tsx, invoice-calc.ts# invoice "paper" card + math; Download PDF button
      document.tsx      # document/report card (markdown)
    pdf/
      invoicePdf.tsx    # @react-pdf/renderer invoice -> Blob (dynamically imported)
      download.ts       # downloadBlob helper
    voice/
      usePilotVoice.ts  # ElevenLabs session wrapper (provider SDK) + client tools
      voiceBridge.ts    # module bridge so non-React code can push to a live session
      useWakeWord.ts    # browser Web Speech "Hey PILOT" listener (Chrome only)
      greetings.ts      # on-screen + spoken greeting pools
    storage/
      config.ts         # reads NEXT_PUBLIC_* env into the store
      context.ts        # uploaded files (localStorage) + getContextText
src-tauri/              # Rust shell, tauri.conf.json (native titlebar), Info.plist (mic), icons/
```

## State — one Zustand store (`src/pilot/state/store.ts`)

`pilotState` (idle/connecting/listening/speaking/thinking), `activeAgent`,
`conversation` (ChatMessage[]), `tasks` (left feed), `widgets` (right canvas,
newest first), `contextFiles`, `config` (API keys), `voiceError`, `notice`.

Plain-TS modules (orchestrator, tools, voice) call
`usePilotStore.getState().*`; components subscribe to thin slices (the Orb only
re-renders on `pilotState`, the canvas only on `widgets`).

## Data flow

**Text path:** composer `onSend` → `orchestrator.sendMessage()` → streams from
OpenRouter into a `ChatMessage`; if the model calls the `show_on_canvas` tool,
`paintCanvas(intent)` generates a widget and pushes it to `widgets` → the right
sidebar renders it. `pilotState` is "thinking" during generation.

**Voice path:** `usePilotVoice` wraps the ElevenLabs session. The agent's
`status`/`mode` drive `pilotState`. Its **client tools** (`show_on_canvas`,
`live_search`, `crew_working`, `read_context`) call the same store actions /
`paintCanvas` as the text path.

**Canvas generation (shared):** `canvas.ts` `generateCanvas(intent)` asks Gemini
to return a typed JSON widget spec — choosing invoice / document / dashboard /
chart — which is validated and rendered. See
[canvas-and-widgets.md](canvas-and-widgets.md).
