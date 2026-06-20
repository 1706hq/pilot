/**
 * Varied greetings so PILOT never opens the same way twice.
 *  - pickGreeting(): the on-screen headline (short).
 *  - pickVoiceGreeting(): the spoken opener, injected into the ElevenLabs agent
 *    as the {{greeting}} dynamic variable each session — witty, warm, varied,
 *    and deliberately NOT "three things need your attention."
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

function timeWord(): string {
  const h = new Date().getHours()
  if (h < 12) return "Morning"
  if (h < 18) return "Afternoon"
  return "Evening"
}

const HEADLINES = [
  "Good to see you, boss.",
  "Ready when you are.",
  "The CREW's assembled.",
  "Standing by.",
  "Where shall we begin?",
  "All systems green.",
  "At your service.",
  "Let's make it count.",
  "The desk is clear.",
  "I've done the boring bits.",
  "Shall we make someone some money?",
  "Listening.",
]

const VOICE_OPENERS = [
  "There you are, boss. I've already done the boring bits.",
  "{time}, Peter. The markets behaved themselves overnight — mostly.",
  "Good to see you. Shall we go and make someone some money?",
  "Right then — what are we conquering today?",
  "{time}, boss. Coffee first, or shall I just dive in?",
  "Back in the chair, I see. The CREW's been busy while you were gone.",
  "{time}. I'd say the day looks quiet, but I've learned not to jinx it.",
  "There's the boss. American Golf's behaving itself; the rest, we'll see.",
  "{time}, Peter. One thing genuinely needs you — the rest I've handled.",
  "Welcome back. I've read everything so you don't have to.",
  "{time}, boss. Nothing's on fire. Yet.",
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

/** Short on-screen headline. */
export function pickGreeting(): string {
  return pick(HEADLINES)
}

/** Spoken opener for a voice session — varied, witty, in-character. */
export function pickVoiceGreeting(): string {
  return pick(VOICE_OPENERS)
}
