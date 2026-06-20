"use client"

/**
 * Single Zustand store for the whole app. Plain-TS modules (orchestrator, tool
 * handlers, voice hooks) call `usePilotStore.getState().*` directly; React
 * components subscribe to thin slices so e.g. the Orb only re-renders on
 * `pilotState` and the right sidebar only on `widgets`.
 */

import { create } from "zustand"

import type {
  AgentId,
  ChatMessage,
  ContextFileMeta,
  PilotConfig,
  PilotState,
  Task,
} from "~/pilot/types"
import type { WidgetBody, WidgetSpec } from "~/pilot/widgets/types"

let idCounter = 0
/** Monotonic, collision-free id (avoids relying on crypto in the webview). */
export function uid(prefix = "id"): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

interface PilotStore {
  pilotState: PilotState
  activeAgent: AgentId
  conversation: ChatMessage[]
  tasks: Task[]
  widgets: WidgetSpec[]
  contextFiles: ContextFileMeta[]
  config: PilotConfig
  /** Last voice connection error / status note, surfaced in the UI. */
  voiceError: string | null
  /** Transient info notice (e.g. "Added 2 files to context"). */
  notice: string | null
  /** Whether the Settings (bring-your-own-key) panel is open. */
  settingsOpen: boolean

  setVoiceError: (msg: string | null) => void
  setNotice: (msg: string | null) => void
  setSettingsOpen: (open: boolean) => void
  setPilotState: (s: PilotState) => void
  setActiveAgent: (a: AgentId) => void

  /** Append a message; returns its id so callers can stream into it. */
  addMessage: (msg: Omit<ChatMessage, "id">) => string
  /** Append a delta to a streaming assistant message. */
  appendToMessage: (id: string, delta: string) => void
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  clearConversation: () => void

  addTask: (task: Omit<Task, "id" | "startedAt">) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  clearTasks: () => void

  /** Stamp meta onto a widget body and push it (newest first). */
  addWidget: (body: WidgetBody, agent: AgentId, source?: string) => string
  removeWidget: (id: string) => void
  clearWidgets: () => void

  setContextFiles: (files: ContextFileMeta[]) => void
  setConfig: (patch: Partial<PilotConfig>) => void
}

export const usePilotStore = create<PilotStore>((set) => ({
  pilotState: "idle",
  activeAgent: "PILOT",
  conversation: [],
  tasks: [],
  widgets: [],
  contextFiles: [],
  config: {},
  voiceError: null,
  notice: null,
  settingsOpen: false,

  setVoiceError: (voiceError) => set({ voiceError }),
  setNotice: (notice) => set({ notice }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setPilotState: (pilotState) => set({ pilotState }),
  setActiveAgent: (activeAgent) => set({ activeAgent }),

  addMessage: (msg) => {
    const id = uid("msg")
    set((s) => ({ conversation: [...s.conversation, { ...msg, id }] }))
    return id
  },
  appendToMessage: (id, delta) =>
    set((s) => ({
      conversation: s.conversation.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m
      ),
    })),
  updateMessage: (id, patch) =>
    set((s) => ({
      conversation: s.conversation.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    })),
  clearConversation: () => set({ conversation: [] }),

  addTask: (task) => {
    const id = uid("task")
    set((s) => ({
      tasks: [...s.tasks, { ...task, id, startedAt: Date.now() }],
    }))
    return id
  },
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  clearTasks: () => set({ tasks: [] }),

  addWidget: (body, agent, source) => {
    const id = uid("w")
    const widget = {
      ...body,
      id,
      agent,
      createdAt: Date.now(),
      ...(source ? { source } : {}),
    } as WidgetSpec
    set((s) => ({ widgets: [widget, ...s.widgets] }))
    return id
  },
  removeWidget: (id) =>
    set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),
  clearWidgets: () => set({ widgets: [] }),

  setContextFiles: (contextFiles) => set({ contextFiles }),
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
}))
