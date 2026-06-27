/**
 * Varied greetings so PILOT never opens the same way twice.
 *  - pickGreeting(): the on-screen headline — a time-of-day salutation to Peter
 *    plus a calm, actionable lead-in (never a count, never "three things…").
 *  - pickVoiceGreeting(): the spoken opener, injected into the ElevenLabs agent
 *    as the {{greeting}} dynamic variable each session — witty, warm, varied.
 */

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

/** The full time-of-day salutation phrase, e.g. "Good morning". */
function timeWord(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

/** The on-screen salutation, e.g. "Good morning, Peter." */
export function timeGreeting(): string {
  return `${timeWord()}, Peter.`
}

/**
 * Calm, actionable lead-ins for the on-screen headline. Deliberately never put
 * a number on things — Peter hates "three things need your attention." Vary the
 * framing: a steer, a reassurance, a single open question.
 */
const LEAD_INS = [
  "Here's what's worth your attention today.",
  "I've read everything — here's what matters.",
  "The desk is clear. Tell me where to point the CREW.",
  "Quiet so far. Where shall we begin?",
  "I've handled the noise. What's first?",
  "All squared away overnight. Your move.",
  "Everything's in order. Say the word.",
  "Caught up on it all. What needs you?",
  "Nothing's on fire. Where do we start?",
  "The CREW's assembled and standing by.",
]

// Restrained ready-and-wait openers. PILOT greets, then STOPS and waits — it
// never volunteers a briefing or company data on connect (Peter's request).
const VOICE_OPENERS = [
  "All agents are ready and waiting, Peter. Just let me know what you need.",
  "PILOT here. The CREW's standing by whenever you want them.",
  "{time}, Peter. Everyone's ready and waiting. Your call.",
  "Ready when you are, Peter. Tell me what you need.",
  "All set and standing by, Peter. What can I get you?",
  "{time}, Peter. Standing by. Say the word.",
]

function resolve(template: string): string {
  return template
    .replace(/\{day\}/g, DAYS[new Date().getDay()])
    .replace(/\{time\}/g, timeWord())
}

function pick(list: string[]): string {
  return resolve(list[Math.floor(Math.random() * list.length)])
}

export interface Greeting {
  /** Time-of-day salutation, e.g. "Good morning, Peter." */
  title: string
  /** A calm, actionable lead-in — varied, never a count. */
  lead: string
}

/** On-screen headline: a time-aware salutation plus a varied lead-in. */
export function pickGreeting(): Greeting {
  return { title: timeGreeting(), lead: pick(LEAD_INS) }
}

/** Spoken opener for a voice session — varied, witty, in-character. */
export function pickVoiceGreeting(): string {
  return pick(VOICE_OPENERS)
}
