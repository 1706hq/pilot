# Releasing updates (in-app auto-update)

PILOT has Tauri's auto-updater wired in. When you publish a new release to GitHub,
Peter's installed app shows an **"Update available"** popup on launch → he clicks
**Update now** → it downloads, installs, and relaunches.

## One-time facts
- **Signing key** (required to sign every update): `~/.tauri/pilot_updater.key`
  (private — keep it safe, never commit; if lost, updates break). Public key is in
  `tauri.conf.json` → `plugins.updater.pubkey`. The key has an **empty password**.
- **Update feed:** `tauri.conf.json` → `plugins.updater.endpoints` points at
  `https://github.com/1706hq/pilot/releases/latest/download/latest.json`.
  So every release must attach a `latest.json` asset, and be the **latest
  non-draft, non-prerelease** release.
- **First install:** the build that *first* contains the updater must be installed
  by Peter manually (drag from the DMG). Every release after that auto-prompts.

## Steps to ship an update

1. Make + commit your changes.
2. **Bump the version** (the updater compares semver — it must be higher than the
   installed one): `version` in `src-tauri/tauri.conf.json` (and `package.json`),
   e.g. `0.1.0` → `0.2.0`.
3. **Build, signed:**
   ```bash
   export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/pilot_updater.key)"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   npm run tauri build
   ```
   This produces, under `src-tauri/target/release/bundle/`:
   - `dmg/pilot_<version>_aarch64.dmg`            ← for fresh installs
   - `macos/pilot.app.tar.gz`                     ← the updater artifact
   - `macos/pilot.app.tar.gz.sig`                 ← its signature
4. **Write `latest.json`** (the signature is the *contents* of the `.sig` file):
   ```json
   {
     "version": "0.2.0",
     "notes": "Short summary of what changed.",
     "pub_date": "2026-06-20T12:00:00Z",
     "platforms": {
       "darwin-aarch64": {
         "signature": "<paste contents of pilot.app.tar.gz.sig>",
         "url": "https://github.com/1706hq/pilot/releases/download/v0.2.0/pilot_0.2.0_aarch64.app.tar.gz"
       }
     }
   }
   ```
   (Rename `pilot.app.tar.gz` to `pilot_<version>_aarch64.app.tar.gz` to match the URL,
   or set the URL to whatever you actually upload.)
5. **Create a GitHub Release** tagged `v0.2.0` on `1706hq/pilot` and upload:
   - `pilot_0.2.0_aarch64.app.tar.gz` (the renamed updater artifact)
   - `latest.json`
   - (optional) the `.dmg` for new installs
   Publish it as the **latest** release (not draft / not pre-release).
6. Done. Peter's app sees it on next launch and offers the update.

## Notes / gotchas
- **Apple Silicon only** right now (`darwin-aarch64`). For Intel too, build a
  universal binary and add a `darwin-x86_64` (or `darwin-universal`) entry to
  `latest.json`.
- **Unsigned by Apple** → first manual install still hits Gatekeeper (right-click →
  Open). Auto-updates themselves work regardless, but Apple Developer ID signing +
  notarization removes the warning entirely.
- To **automate** all of this (push a git tag → CI builds + signs + publishes the
  release + `latest.json`), use the `tauri-apps/tauri-action` GitHub Action with
  the signing key + password stored as repo secrets. Then "release" = push a tag.
- The updater only runs in the packaged app; it no-ops in the browser/dev.
