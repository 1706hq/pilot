"use client"

import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

import BorderGlow from "~/components/BorderGlow"
import DarkVeil from "~/components/dark-veil"
import { ReferenceComposer } from "~/components/home/reference-composer"
import { HarnessSidebar } from "~/components/home/reference-sidebar"
import Orb from "~/components/orb/Orb"
import type { Project, Session } from "~/core/db/types"
import { WindowControls } from "~/tauri-controls"

const PROJECT = "Lumin"
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const PROJECTS: Project[] = [
  { id: "lumin", name: "Lumin" },
  { id: "syncra", name: "Syncra" },
  { id: "atlas", name: "Atlas" },
]

const SESSIONS: Session[] = [
  { id: "lumin-1", project_id: "lumin", title: "Sidebar layout pass" },
  { id: "lumin-2", project_id: "lumin", title: "Composer animation" },
  { id: "lumin-3", project_id: "lumin", title: "Greeting copy" },
  { id: "syncra-1", project_id: "syncra", title: "Auth flow" },
  { id: "syncra-2", project_id: "syncra", title: "Realtime sync" },
  { id: "atlas-1", project_id: "atlas", title: "Initial scaffold" },
]

function buildGreetings(name: string): string[] {
  return [
    "What's on your mind?",
    "Ready when you are.",
    "What are we building today?",
    `Welcome back, ${name}.`,
    `Continue ${PROJECT}?`,
    `What's next for ${PROJECT}?`,
    `Any updates on ${PROJECT}?`,
    `Evening, ${name}.`,
    "Burning the midnight oil?",
    "Private session.",
    `How's your {day} going?`,
    "Another {day}, another build.",
    `Picking up where we left off on ${PROJECT}.`,
    "Ready to ship something?",
    "What's the goal today?",
  ]
}

function resolveGreeting(template: string): string {
  const day = DAYS[new Date().getDay()]
  return template.replace(/\{day\}/g, day)
}

export default function Home() {
  const [greeting, setGreeting] = useState("")
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    invoke<string>("get_username")
      .catch(() => "there")
      .then((name) => {
        const greetings = buildGreetings(name)
        const template = greetings[Math.floor(Math.random() * greetings.length)]
        setGreeting(resolveGreeting(template))
      })
  }, [])

  return (
    <main className="relative h-screen overflow-hidden bg-[#03060d] text-white">
      <div
        className="fixed left-0 right-[138px] top-0 z-[490] h-9"
        data-tauri-drag-region
      />
      <WindowControls
        className="fixed right-0 top-0 z-[500] text-sky-50"
        justify
      />

      <div className="pointer-events-none absolute inset-0">
        <DarkVeil
          hueShift={210}
          noiseIntensity={0.07}
          resolutionScale={1}
          scanlineFrequency={0.7}
          scanlineIntensity={0.02}
          speed={0.04}
          warpAmount={0.12}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_58%_at_58%_22%,rgba(176,211,255,0.72),rgba(82,142,245,0.48)_34%,rgba(4,10,25,0)_68%),radial-gradient(68%_62%_at_46%_44%,rgba(38,111,235,0.48),rgba(0,32,78,0.32)_48%,rgba(0,0,0,0)_78%),radial-gradient(90%_75%_at_18%_94%,rgba(0,0,0,0.72),rgba(0,0,0,0)_54%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(3,8,17,0.28)_54%,rgba(3,8,17,0.92)_100%)]" />

      <div className="absolute inset-0 z-10">
        <div className="flex h-full">
          <div className="z-20 h-full">
            <HarnessSidebar
              projects={PROJECTS}
              sessions={SESSIONS}
              activeProjectId={activeProjectId}
              activeSessionId={activeSessionId}
              onSelectProject={(project) => setActiveProjectId(project.id)}
              onSelectSession={(project, session) => {
                setActiveProjectId(project.id)
                setActiveSessionId(session.id)
              }}
              onNewSession={(project) => setActiveProjectId(project.id)}
              onOpenProject={() => undefined}
              onOpenSettings={() => undefined}
            />
          </div>

          <main className="relative z-10 min-w-0 flex-1">
            <HomeView greeting={greeting} />
          </main>
        </div>
      </div>
    </main>
  )
}

function HomeView({ greeting }: { greeting: string }) {
  return (
    <section
      aria-label="Lumin home"
      className="absolute inset-0 flex flex-col items-center px-[clamp(32px,6vw,96px)] pt-[clamp(160px,28vh,320px)]"
    >
      <div className="relative flex w-full max-w-[760px] flex-col items-center text-center">
        <h1 className="text-[clamp(32px,4vw,64px)] font-semibold leading-[0.95] tracking-normal text-white drop-shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
          {greeting}
        </h1>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 grid size-72 -translate-x-1/2 -translate-y-1/2 place-items-center opacity-100 drop-shadow-[0_0_52px_rgba(56,151,255,0.46)]">
        <Orb
          animate={false}
          backgroundColor="#03060d"
          hoverIntensity={0}
          hue={0}
          rotateOnHover={false}
        />
      </div>

      <div className="chat-dock fixed left-1/2 top-[82vh] w-[min(calc(100vw-64px),920px)] -translate-x-1/2">
        <div className="relative">
          <BorderGlow
            interactive={false}
            edgeSensitivity={30}
            glowIntensity={1}
            coneSpread={25}
            glowRadius={40}
            borderRadius={28}
            animated
            colors={["#c084fc", "#f472b6", "#38bdf8"]}
            backgroundColor="transparent"
          >
            <ReferenceComposer />
          </BorderGlow>
        </div>
      </div>
    </section>
  )
}
