# Cross-device sync store

So Peter uploads a report once and sees it on every device, PILOT pushes the
small analysed result (the knowledge base JSON, never the raw files) to one
private store and pulls it back on each device. Analysis still runs on-device;
this only shares the output.

The app is endpoint-agnostic. It needs a URL that:

- `GET` returns the saved payload (`{ "knowledge": [...] }`, a bare array, or
  `{ "result": "<json string>" }`),
- `PUT` saves the JSON body,
- both behind a bearer token.

That's it. Set the URL + token on each device (Settings → "Sync across devices",
or `NEXT_PUBLIC_PILOT_SYNC_URL` / `NEXT_PUBLIC_PILOT_SYNC_TOKEN`). Leave blank and
the app behaves exactly as before (everything stays on-device).

## Simplest store: a Cloudflare Worker + KV (free, ~5 minutes)

1. Cloudflare dashboard → Workers & Pages → create a Worker.
2. Add a KV namespace (e.g. `PILOT_KB`) and bind it to the Worker as `KB`.
3. Set a Worker variable `TOKEN` to a long random secret.
4. Paste this and deploy:

```js
export default {
  async fetch(req, env) {
    const auth = req.headers.get("authorization") || ""
    if (auth !== `Bearer ${env.TOKEN}`) return new Response("unauthorized", { status: 401 })
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,PUT,OPTIONS" }
    if (req.method === "OPTIONS") return new Response(null, { headers: cors })
    if (req.method === "PUT") {
      await env.KB.put("peter", await req.text())
      return new Response("ok", { headers: cors })
    }
    const data = (await env.KB.get("peter")) || '{"knowledge":[]}'
    return new Response(data, { headers: { ...cors, "content-type": "application/json" } })
  },
}
```

5. Put the Worker URL and the `TOKEN` into PILOT Settings on the Mac and the
   phone. Done — uploads on one device appear on the other.

## Notes
- It holds Peter's analysed figures, so keep the token private. For the most
  confidential material, the proper secure backend (the one we're scoping with
  Kris) is the long-term home; this is the lightweight version for the prototype.
- A single user, one key (`peter`). Multi-user comes with the production backend.
- Works the same for the desktop app and the mobile web build — both just point
  at the one URL.
