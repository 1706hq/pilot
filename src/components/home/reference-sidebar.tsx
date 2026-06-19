"use client";

/**
 * Harness sidebar.
 *
 * Shows projects with their sessions, plus an entry point to Settings. Wired
 * to harness state; selecting a project/session updates the main view.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconChevronRight,
  IconMessage,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { Sidebar, SidebarBody, useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import type { Project, Session } from "~/core/db/types";

const PROJECT_BADGE_STYLES = [
  "bg-[#5a2d11] text-[#ff8f3b]",
  "bg-[#4a2f67] text-[#c98cff]",
  "bg-[#5a1f4b] text-[#ff5cb8]",
  "bg-[#334d10] text-[#d4ff58]",
  "bg-[#0d5a58] text-[#61f2e7]",
  "bg-[#113e74] text-[#56a1ff]",
];

function projectBadgeStyle(name: string) {
  const seed = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PROJECT_BADGE_STYLES[seed % PROJECT_BADGE_STYLES.length];
}

function ProjectBadge({ name }: { name: string }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[16px] font-semibold uppercase leading-none",
        projectBadgeStyle(name),
      )}
    >
      {name.trim().charAt(0) || "P"}
    </span>
  );
}

function Brand() {
  const { open, animate } = useSidebar();
  return (
    <div className="flex items-center gap-2.5 px-1.5 py-1">
      <div className="grid h-8 w-8 shrink-0 place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Lumin" className="h-full w-full object-contain" src="/favicon.ico" />
      </div>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="whitespace-pre text-sm font-semibold tracking-tight text-white"
      >
        Lumin
      </motion.span>
    </div>
  );
}

function ProjectItem({
  project,
  sessions,
  activeProjectId,
  activeSessionId,
  onSelectProject,
  onSelectSession,
  onNewSession,
}: {
  project: Project;
  sessions: Session[];
  activeProjectId: string | null;
  activeSessionId: string | null;
  onSelectProject: (p: Project) => void;
  onSelectSession: (p: Project, s: Session) => void;
  onNewSession: (p: Project) => void;
}) {
  const { open, animate } = useSidebar();
  const expanded = animate ? open : true;
  const [isOpen, setIsOpen] = useState(project.id === activeProjectId);
  const projectSessions = sessions.filter((s) => s.project_id === project.id);

  return (
    <div className="flex flex-col">
      <button
        className={cn(
          "group relative flex min-h-10 items-center rounded-lg px-0.5 py-1.5 text-left transition hover:bg-white/10",
          project.id === activeProjectId && "bg-white/8",
        )}
        data-click-effect
        onClick={() => {
          onSelectProject(project);
          setIsOpen((v) => !v);
        }}
        type="button"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center">
          <ProjectBadge name={project.name} />
        </span>
        {expanded && (
          <div className="ml-2 flex min-w-0 flex-1 items-center">
            <motion.span
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="min-w-0 flex-1 truncate whitespace-pre text-sm text-white/82"
            >
              {project.name}
            </motion.span>
            <motion.span animate={{ opacity: 1 }} className="shrink-0">
              <IconChevronRight
                className={cn(
                  "h-4 w-4 text-white/42 transition-transform duration-200",
                  isOpen && "rotate-90",
                )}
              />
            </motion.span>
          </div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-[15px] flex flex-col gap-0.5 border-l border-white/10 pb-1 pl-2 pt-1">
              {projectSessions.map((session) => (
                <button
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/10",
                    session.id === activeSessionId && "bg-white/10",
                  )}
                  data-click-effect
                  onClick={() => onSelectSession(project, session)}
                  type="button"
                >
                  <IconMessage className="h-3.5 w-3.5 shrink-0 text-white/42" />
                  <span className="truncate text-[13px] text-white/64">
                    {session.title}
                  </span>
                </button>
              ))}
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white/42 transition hover:bg-white/10 hover:text-white/72"
                data-click-effect
                onClick={() => onNewSession(project)}
                type="button"
              >
                <IconPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[13px]">New session</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HarnessSidebar({
  projects,
  sessions,
  activeProjectId,
  activeSessionId,
  onSelectProject,
  onSelectSession,
  onNewSession,
  onOpenProject,
  onOpenSettings,
}: {
  projects: Project[];
  sessions: Session[];
  activeProjectId: string | null;
  activeSessionId: string | null;
  onSelectProject: (p: Project) => void;
  onSelectSession: (p: Project, s: Session) => void;
  onNewSession: (p: Project) => void;
  onOpenProject: () => void;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto model-picker-scroll">
          <Brand />
          <div className="h-px w-full bg-white/8" />

          <div className="flex flex-1 flex-col gap-0.5">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                sessions={sessions}
                activeProjectId={activeProjectId}
                activeSessionId={activeSessionId}
                onSelectProject={onSelectProject}
                onSelectSession={onSelectSession}
                onNewSession={onNewSession}
              />
            ))}
            <EmptyProjectsHint show={projects.length === 0} />
            <button
              aria-label="Open folder as project"
              className="mt-2 flex h-10 items-center justify-center rounded-xl border border-white/10 text-white/52 transition hover:bg-white/10 hover:text-white/88"
              data-click-effect
              onClick={onOpenProject}
              type="button"
            >
              <IconPlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <SettingsButton onClick={onOpenSettings} />
      </SidebarBody>
    </Sidebar>
  );
}

/** "No projects yet" hint — only rendered when the sidebar is fully expanded. */
function EmptyProjectsHint({ show }: { show: boolean }) {
  const { open, animate } = useSidebar();
  const expanded = animate ? open : true;
  if (!show || !expanded) return null;
  return (
    <p className="px-2 py-2 text-[12px] text-white/40">No projects yet.</p>
  );
}

/** Settings entry — icon stays put; only the label fades to avoid any jump. */
function SettingsButton({ onClick }: { onClick: () => void }) {
  const { open, animate } = useSidebar();
  const expanded = animate ? open : true;
  return (
    <button
      className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-white/64 transition hover:bg-white/10 hover:text-white/88"
      data-click-effect
      onClick={onClick}
      type="button"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center">
        <IconSettings className="h-5 w-5" />
      </span>
      <motion.span
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="whitespace-pre text-sm"
      >
        Settings
      </motion.span>
    </button>
  );
}
