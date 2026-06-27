# Hosted demo + sync store (live)

The mobile/web version of PILOT for Peter, plus the cross device sync store. Set
up on Craig's Vercel (team: craig-hepburns-projects). Secrets live in Vercel env
vars, never in this repo.

## The web app

- Live URL: https://pilot-pj.vercel.app
- Vercel project: pilot-pj
- Built from the static export (`output: "export"`), same code as the desktop app.
- Gated by a passcode (see the Gate component, `src/components/gate.tsx`). The
  passcode itself is never in the bundle, only its SHA-256 hash, held in the
  `NEXT_PUBLIC_PILOT_GATE_HASH` env var on the project.
- `robots: noindex` so it is not discoverable in search.
- No API keys are baked in. Peter enters his own OpenRouter + ElevenLabs keys,
  which stay on his device.

### Change the passcode
Compute `printf "NEWCODE" | shasum -a 256`, set the hex as
`NEXT_PUBLIC_PILOT_GATE_HASH` in the pilot-pj project, then redeploy
(`vercel --prod` from the repo root).

## The sync store

So Peter uploads once and his analysed data follows him between devices.

- Endpoint: https://pilot-sync-api.vercel.app/api/sync
- Vercel project: pilot-sync-api (a single serverless function, `api/sync.js`).
- Storage: a private Vercel Blob store (pilot-sync). The function reads/writes one
  JSON blob and gates every request behind a bearer token (`SYNC_TOKEN` env var).
- The web app has the endpoint + token baked in (`NEXT_PUBLIC_PILOT_SYNC_URL` and
  `NEXT_PUBLIC_PILOT_SYNC_TOKEN` on pilot-pj), so it syncs with no setup.

### Wire the desktop (Mac) app into the same store
One time, in the app: Settings, "Sync across devices", paste the endpoint into
Sync store URL and the token into Sync token, Save. The token is in the
pilot-sync-api project's env (`SYNC_TOKEN`).

## Honest limits (prototype, not production)

Because this is a client app with values baked in for convenience, the practical
security is the obscure noindex URL plus the passcode, not the tokens themselves.
Good enough for a private demo. Real auth and server side data protection come
with the production backend (the work mapped out with Kris).
