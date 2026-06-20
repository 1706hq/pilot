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
import { addContextFiles } from "~/pilot/storage/context"
import { usePilotStore } from "~/pilot/state/store"
import type { Task } from "~/pilot/types"

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
            void addContextFiles(e.target.files).then(({ added, skippedImages }) => {
              const parts: string[] = []
              if (added > 0) parts.push(`Added ${added} file${added > 1 ? "s" : ""} to PILOT's context`)
              if (skippedImages > 0) parts.push(`skipped ${skippedImages} image${skippedImages > 1 ? "s" : ""}`)
              const store = usePilotStore.getState()
              store.setNotice(parts.join(" · ") || "Nothing added")
              setTimeout(() => usePilotStore.getState().setNotice(null), 3500)
            })
          }
          e.target.value = ""
        }}
      />
      <button
        type="button"
        data-click-effect
        onClick={() => inputRef.current?.click()}
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
              Add context
            </div>
            <div className="truncate text-[11px] text-white/40">
              {count > 0
                ? `${count} file${count > 1 ? "s" : ""} in context`
                : "Upload files for PILOT"}
            </div>
          </div>
        ) : null}
      </button>
    </div>
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

        <AddContextButton />
      </SidebarBody>
    </Sidebar>
  )
}
