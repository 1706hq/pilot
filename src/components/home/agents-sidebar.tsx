"use client"

/**
 * Left sidebar — the CREW roster plus the live sub-agent task feed. Agents glow
 * when active; tasks show what the CREW is off doing (working / done / error).
 */

import { useRef } from "react"
import { motion } from "motion/react"

import { Sidebar, SidebarBody, useSidebar } from "~/components/ui/sidebar"
import { cn } from "~/lib/utils"
import { AGENTS, CREW, type AgentMeta } from "~/pilot/agents/agents"
import {
  addContextFiles,
  clearContext,
  describeUpload,
  removeContextFile,
  SUPPORTED_HINT,
} from "~/pilot/storage/context"
import { usePilotStore } from "~/pilot/state/store"
import type { ContextFileStatus, Task } from "~/pilot/types"

function ExpandLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  return (
    <motion.div
      animate={{ opacity: expanded ? 1 : 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn("min-w-0 overflow-hidden whitespace-nowrap", className)}
    >
      {children}
    </motion.div>
  )
}

function AgentRow({ agent, active }: { agent: AgentMeta; active: boolean }) {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  return (
    <div
      className={cn(
        "group relative flex w-full items-center rounded-xl text-left transition-colors",
        expanded ? "gap-3 px-2" : "justify-center"
      )}
    >
      <span
        className="grid size-12 shrink-0 place-items-center rounded-lg text-[18px] font-semibold transition-all"
        style={{
          color: agent.accent,
          backgroundColor: `${agent.accent}1f`,
          boxShadow: active ? `0 0 20px ${agent.accent}66` : "none",
        }}
      >
        {agent.monogram}
      </span>
      {expanded ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className="truncate text-sm font-medium"
            style={{ color: agent.accent }}
          >
            {agent.name}
          </div>
          <div className="truncate text-[11px] text-white/45">{agent.role}</div>
        </div>
      ) : null}
      {active && expanded ? (
        <span
          className="absolute right-2 size-1.5 rounded-full"
          style={{ backgroundColor: agent.accent }}
        />
      ) : null}
    </div>
  )
}

const STATUS_COLOR: Record<Task["status"], string> = {
  working: "#fbbf24", // amber
  done: "#34d399", // emerald
  error: "#f87171", // red
}

function StatusDot({ status }: { status: Task["status"] }) {
  if (status === "working") {
    return (
      <span className="relative grid size-6 place-items-center">
        <span className="absolute size-6 animate-ping rounded-full bg-amber-400/40" />
        <span className="size-3 rounded-full bg-amber-400" />
      </span>
    )
  }
  if (status === "error") {
    return <span className="size-3 rounded-full bg-red-400" />
  }
  return (
    <svg
      className="size-6 text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  )
}

function TaskRow({ task }: { task: Task }) {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  const accent = AGENTS[task.agent].accent
  return (
    <div
      className={cn(
        "flex w-full items-center rounded-lg",
        expanded ? "gap-3 px-2" : "justify-center"
      )}
    >
      <span
        className="grid size-12 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `${STATUS_COLOR[task.status]}1f` }}
      >
        <StatusDot status={task.status} />
      </span>
      {expanded ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate text-[12.5px] text-white/80">{task.label}</div>
          <div className="flex items-center gap-1.5 text-[10.5px] text-white/40">
            <span style={{ color: accent }}>{task.agent}</span>
            {task.detail ? <span className="truncate">· {task.detail}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Human-readable file size. */
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Honest read-status chip — can PILOT actually read this file's contents? */
function StatusPill({ status }: { status: ContextFileStatus }) {
  const readable = status === "text" || status === "extracted"
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[9.5px] font-medium uppercase tracking-[0.08em]",
        readable
          ? "bg-sky-400/12 text-sky-300/90"
          : "bg-amber-400/12 text-amber-300/90"
      )}
      title={
        readable
          ? "PILOT can read this file's contents"
          : "Stored by name only — PILOT can't read the contents (e.g. a scanned PDF)"
      }
    >
      {readable ? "Readable" : "Name only"}
    </span>
  )
}

/**
 * Persistent, auditable list of what Peter has uploaded — so he can confirm and
 * review his context any time (and see whether each file is actually readable).
 * Only shown expanded; collapses with the sidebar.
 */
function ContextFiles() {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  const files = usePilotStore((s) => s.contextFiles)
  if (!expanded || files.length === 0) return null

  return (
    <div className="flex min-h-0 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Context · {files.length}
        </span>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm("Remove all uploaded files from PILOT's context?")
            )
              clearContext()
          }}
          className="text-[11px] text-white/40 transition hover:text-white/70"
        >
          Clear all
        </button>
      </div>
      <div className="model-picker-scroll flex max-h-44 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {files
          .slice()
          .reverse()
          .map((f) => (
            <div
              key={f.name}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
            >
              <svg
                className="size-4 shrink-0 text-white/35"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                />
              </svg>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-[12px] text-white/80">{f.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
                  <StatusPill status={f.status} />
                  <span className="tabular-nums">{fmtSize(f.size)}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                title={`Remove ${f.name}`}
                onClick={() => removeContextFile(f.name)}
                className="grid size-6 shrink-0 place-items-center rounded-md text-white/30 opacity-0 transition hover:bg-white/10 hover:text-white/80 group-hover:opacity-100"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

/** Bottom-left "Add context" tile — uploads files into PILOT's local context. */
function AddContextButton() {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  const inputRef = useRef<HTMLInputElement>(null)
  const count = usePilotStore((s) => s.contextFiles.length)

  return (
    <div className="pt-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            void addContextFiles(e.target.files).then((result) => {
              const store = usePilotStore.getState()
              store.setNotice(describeUpload(result))
              setTimeout(() => usePilotStore.getState().setNotice(null), 5000)
            })
          }
          e.target.value = ""
        }}
      />
      <button
        type="button"
        data-click-effect
        onClick={() => inputRef.current?.click()}
        title="Add files to PILOT's context"
        aria-label="Add files to PILOT's context"
        className={cn(
          "group flex w-full items-center rounded-lg text-left transition-colors",
          expanded ? "gap-3 px-2 py-1 hover:bg-white/5" : "justify-center"
        )}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/8 text-white/70 transition group-hover:bg-white/[0.14] group-hover:text-white">
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        {expanded ? (
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="truncate text-sm font-medium text-white/85">
              Add files
            </div>
            <div className="truncate text-[11px] text-white/40">
              {count > 0
                ? `${count} loaded · ${SUPPORTED_HINT}`
                : SUPPORTED_HINT}
            </div>
          </div>
        ) : null}
      </button>
    </div>
  )
}

/** Settings (bring-your-own-key) — opens the keys panel. Sits under Add files. */
function SettingsButton() {
  const { open, animate } = useSidebar()
  const expanded = animate ? open : true
  const setSettingsOpen = usePilotStore((s) => s.setSettingsOpen)
  const configured = usePilotStore((s) => Boolean(s.config.openRouterKey))

  return (
    <button
      type="button"
      data-click-effect
      onClick={() => setSettingsOpen(true)}
      title="Settings — your API keys"
      aria-label="Open settings"
      className={cn(
        "group flex w-full items-center rounded-lg text-left transition-colors",
        expanded ? "gap-3 px-2 py-1 hover:bg-white/5" : "justify-center"
      )}
    >
      <span className="relative grid size-12 shrink-0 place-items-center rounded-lg bg-white/8 text-white/70 transition group-hover:bg-white/[0.14] group-hover:text-white">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
        {!configured ? (
          <span
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            title="Add your API keys to get started"
          />
        ) : null}
      </span>
      {expanded ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate text-sm font-medium text-white/85">Settings</div>
          <div className="truncate text-[11px] text-white/40">
            {configured ? "API keys · this device" : "Add your API keys"}
          </div>
        </div>
      ) : null}
    </button>
  )
}

export function AgentsSidebar() {
  const activeAgent = usePilotStore((s) => s.activeAgent)
  const tasks = usePilotStore((s) => s.tasks)

  return (
    <Sidebar side="left" widthClosed={80}>
      <SidebarBody className="gap-5">
        <ExpandLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Crew
        </ExpandLabel>
        <div className="flex flex-col gap-4">
          {CREW.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              active={activeAgent === agent.id}
            />
          ))}
        </div>

        <div className="my-1 h-px bg-white/8" />

        <ExpandLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Tasks
        </ExpandLabel>
        <div className="model-picker-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden">
          {tasks.length === 0 ? (
            <ExpandLabel className="px-2 text-[12px] leading-relaxed text-white/30">
              Idle. The CREW is standing by.
            </ExpandLabel>
          ) : (
            tasks
              .slice()
              .reverse()
              .map((task) => <TaskRow key={task.id} task={task} />)
          )}
        </div>

        <ContextFiles />
        <div className="flex flex-col gap-1">
          <AddContextButton />
          <SettingsButton />
        </div>
      </SidebarBody>
    </Sidebar>
  )
}
