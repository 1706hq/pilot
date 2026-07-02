"use client"

/**
 * One resilient call site for EVERY OpenRouter request in PILOT.
 *
 * The whole app used to `fetch` OpenRouter directly with no timeout and no
 * retry, so any transient hiccup — a 429 rate-limit under upload concurrency, a
 * 5xx, a network blip, a hung connection — would silently drop a page (wrong
 * numbers), kill an entire upload ("BLACKBOX failed"), or fail the Runway
 * ("timed out, try again"). Routing every call through here fixes that at the
 * root: a per-attempt timeout so nothing hangs forever, and automatic retry with
 * backoff (honouring Retry-After) on exactly the failures that are worth
 * retrying. One bad page or one slow response no longer wastes the whole job.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

/** Transient statuses worth retrying. 4xx like 401/400 are NOT retried. */
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504])

function headers(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://pilot.local",
    "X-Title": "PILOT",
  }
}

/** Backoff for attempt N (0-based): quick first retry, then ease off. Honours
 *  a server Retry-After when present. Jittered so parallel pages don't sync up. */
function backoffMs(attempt: number, retryAfter?: string | null): number {
  const ra = Number(retryAfter)
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 15_000)
  const base = [700, 1800, 4000, 7000][attempt] ?? 9000
  return base + Math.floor(Math.random() * 400)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}

interface JsonOpts {
  /** Per-attempt timeout. Vision/analysis calls are slow, so this is generous. */
  timeoutMs?: number
  /** Extra attempts after the first. */
  retries?: number
  /** Optional caller abort (e.g. a superseding request). */
  signal?: AbortSignal
}

/** URL citation annotation attached by the OpenRouter web plugin. */
export interface UrlAnnotation {
  type?: string
  url_citation?: { url?: string; title?: string }
}

export interface ChatMessageResult {
  content: string
  annotations: UrlAnnotation[]
}

/**
 * Non-streaming chat completion returning the full message (content + any
 * web-plugin source annotations). Timeout + retry cover the whole request
 * including reading the body. Throws after exhausting retries, or immediately
 * on a non-retryable status / the caller's abort.
 */
export async function openrouterMessage(
  apiKey: string,
  body: Record<string, unknown>,
  opts: JsonOpts = {}
): Promise<ChatMessageResult> {
  const { timeoutMs = 90_000, retries = 3, signal } = opts
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort()
    signal?.addEventListener("abort", onAbort, { once: true })
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: headers(apiKey),
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const retryAfter = res.headers.get("retry-after")
        const detail = await res.text().catch(() => "")
        if (attempt < retries && RETRYABLE.has(res.status)) {
          clearTimeout(timer)
          signal?.removeEventListener("abort", onAbort)
          await sleep(backoffMs(attempt, retryAfter), signal)
          continue
        }
        throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 160)}`)
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string; annotations?: UrlAnnotation[] } }[]
      }
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      const msg = data?.choices?.[0]?.message
      const content = msg?.content
      if (typeof content !== "string" || !content) throw new Error("empty response")
      return { content, annotations: msg?.annotations ?? [] }
    } catch (e) {
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      if (signal?.aborted) throw e // caller cancelled — don't retry
      lastErr = e
      if (attempt < retries) {
        await sleep(backoffMs(attempt), signal)
        continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("OpenRouter request failed")
}

/**
 * Non-streaming chat completion. Returns `choices[0].message.content` (a string,
 * usually JSON when the caller set response_format). See openrouterMessage.
 */
export async function openrouterContent(
  apiKey: string,
  body: Record<string, unknown>,
  opts: JsonOpts = {}
): Promise<string> {
  return (await openrouterMessage(apiKey, body, opts)).content
}

interface StreamOpts {
  timeoutMs?: number
  retries?: number
}

/**
 * Streaming chat completion. Returns the ok Response so the caller can read
 * `res.body`. The timeout guards only until the response headers arrive (so a
 * long stream isn't cut off mid-answer); the caller's `signal` stays linked for
 * the whole stream so a superseding message can still abort it. Retries the
 * CONNECTION only — once tokens start flowing we don't restart.
 */
export async function openrouterStream(
  apiKey: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
  opts: StreamOpts = {}
): Promise<Response> {
  const { timeoutMs = 45_000, retries = 2 } = opts
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    const ctrl = new AbortController()
    // Linked for the whole stream lifetime so caller-abort propagates to the body.
    signal.addEventListener("abort", () => ctrl.abort(), { once: true })
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: headers(apiKey),
        body: JSON.stringify({ ...body, stream: true }),
      })
      clearTimeout(timer) // headers in — let the body stream under the caller's signal
      if (res.ok && res.body) return res
      const retryAfter = res.headers.get("retry-after")
      const detail = await res.text().catch(() => "")
      if (attempt < retries && RETRYABLE.has(res.status)) {
        await sleep(backoffMs(attempt, retryAfter), signal)
        continue
      }
      throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 160)}`)
    } catch (e) {
      clearTimeout(timer)
      if (signal.aborted) throw e
      lastErr = e
      if (attempt < retries) {
        await sleep(backoffMs(attempt), signal)
        continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("OpenRouter request failed")
}
