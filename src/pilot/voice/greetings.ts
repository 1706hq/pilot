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

const VOICE_OPENERS = [
  "There you are, Peter. I've already done the boring bits.",
  "{time}, Peter. The markets behaved themselves overnight — mostly.",
  "Good to see you. Shall we go and make someone some money?",
  "Right then — what are we conquering today?",
  "{time}, Peter. Coffee first, or shall I just dive in?",
  "Back in the chair, I see. The CREW's been busy while you were gone.",
  "{time}. I'd say the day looks quiet, but I've learned not to jinx it.",
  "There's Peter. American Golf's behaving itself; the rest, we'll see.",
  "{time}, Peter. One thing genuinely needs you — the rest I've handled.",
  "Welcome back, Peter. I've read everything so you don't have to.",
  "{time}, Peter. Nothing's on fire. Yet.",
  "Good to see you. Give me the word and I'll point the CREW at it.",
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
