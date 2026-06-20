# Setup & running

## Prerequisites

- **Node** (project uses Next 16). `npm install` to get deps.
- **Rust** (for the native app): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
  then `source "$HOME/.cargo/env"`. Xcode command-line tools on macOS.

## Environment / keys

Keys live in **`.env.local`** (gitignored — `.env.*` is ignored, so secrets are
NOT committed). Create it from this template:

```
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-...
NEXT_PUBLIC_ELEVENLABS_API_KEY=sk_...
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_5801kvdenajhens9ppvp0xvyd8yp
NEXT_PUBLIC_PICOVOICE_KEY=          # optional, for a future native wake word
NEXT_PUBLIC_OPENROUTER_MODEL=google/gemini-3.5-flash
```

`src/pilot/storage/config.ts` reads these into the store on boot. There's no
in-app settings panel yet — env is the source of keys.

## Run

**Browser (fast, for UI work):**
```
npm run dev        # next dev on http://localhost:1420
```
Everything works in the browser EXCEPT: native window controls (none — uses the
real macOS title bar in the app), and the native mic permission flow. Voice +
the Web-Speech wake word work in Chrome.

**Native macOS app (the real product):**
```
npm run tauri dev  # builds Rust + opens the frameless native window on :1420
```
First Rust build takes a few minutes; subsequent ones are ~10-25s. Launching the
GUI app from a detached/non-TTY process can exit right after the window opens —
**run it from your own terminal** for it to stay alive.

## App icon

The icon is generated from **`app-icon.svg`** (the pilot ring on a blue→orange
gradient) via `npm run tauri icon app-icon.svg`, which writes all sizes into
`src-tauri/icons/`. macOS caches dock icons aggressively — after regenerating,
relaunch and `killall Dock` (a full quit/relaunch clinches it).

## Window config

`src-tauri/tauri.conf.json`: `decorations: true` + `titleBarStyle: "Overlay"` +
`hiddenTitle: true` gives the **native macOS traffic lights** over a transparent
title bar (content runs full-bleed underneath). `src-tauri/Info.plist` carries
`NSMicrophoneUsageDescription` for mic access.

## Troubleshooting

- **Port 1420 in use:** `lsof -ti:1420 | xargs kill -9`.
- **Voice does nothing:** check the VoiceBanner — usually "Microphone blocked"
  (allow mic in the address bar / system prefs and reload).
- **PILOT can't see uploaded files:** they're probably PDFs (not text-extracted)
  — upload a `.txt`/`.md` to confirm; see [context-uploads.md](context-uploads.md).
- **Dashboards only, no invoices:** ensure `canvas.ts` generator is current (it
  must let the model choose the type) and the agent's `show_on_canvas` description
  mentions invoices/documents.
- **react-pdf build errors:** it's dynamically imported in `invoice.tsx`'s
  download handler — keep it that way (don't import at module top).
