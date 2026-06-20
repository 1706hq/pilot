"use client"

/**
 * A tiny module-level bridge so non-React code (e.g. the context uploader in the
 * sidebar, which lives outside the ConversationProvider) can push updates into
 * the live voice conversation. usePilotVoice keeps these populated.
 */

export const voiceBridge: {
  active: boolean
  sendContextualUpdate: (text: string) => void
} = {
  active: false,
  sendContextualUpdate: () => {},
}
