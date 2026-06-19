"use client"

import { useState } from "react"

import { PlaceholdersAndVanishInput } from "~/components/ui/placeholders-and-vanish-input"

function Icon({
  name,
  className = "",
}: {
  name: "attach" | "mic"
  className?: string
}) {
  const common = {
    className,
    fill: "none",
    height: "18",
    viewBox: "0 0 24 24",
    width: "18",
  }

  if (name === "attach") {
    return (
      <svg {...common}>
        <path
          d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.8-8.8a4 4 0 1 1 5.7 5.7l-8.9 8.8a2 2 0 0 1-2.8-2.8l8.2-8.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path
        d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 0 0-7 0V11a3.5 3.5 0 0 0 3.5 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M18.5 11a6.5 6.5 0 0 1-13 0M12 17.5V21M9 21h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function ReferenceComposer() {
  const [value, setValue] = useState("")

  return (
    <div className="composer-intro relative w-full">
      <div
        className="chat-surface relative overflow-visible rounded-[28px] border border-white/12 bg-black/78 px-4 py-3 text-white shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
        style={{
          boxShadow:
            "rgba(255,255,255,0.10) 0px 0px 0px 1px inset, rgba(0,0,0,0.46) 0px 18px 48px -18px, rgba(0,0,0,0.54) 0px 32px 88px -36px",
        }}
      >
        <div className="flex min-h-12 items-center gap-3">
          <PlaceholdersAndVanishInput
            buttonClassName="right-0 h-11 w-11 border border-white/10 bg-white/10 text-white disabled:bg-white/5 disabled:text-white/35 hover:bg-white/16 active:scale-95"
            canvasClassName="left-0 top-[12px] pr-16 filter-none sm:left-0"
            className="mx-0 h-12 max-w-none flex-1"
            inputClassName="h-12 pl-0 pr-14 text-[15px] text-white sm:pl-0 sm:text-[15px]"
            onChange={(event) => setValue(event.currentTarget.value)}
            onSubmit={(event) => {
              event.preventDefault()
              setValue("")
            }}
            placeholderClassName="pl-0 text-[15px] text-white/48 sm:pl-0 sm:text-[15px]"
            value={value}
            placeholders={[
              "Type a message...",
              "Ask Lumin to plan your next step",
              "Capture an idea before it fades",
            ]}
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            aria-label="Start voice input"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-white/10 text-white/82 transition hover:bg-white/16 active:scale-95"
            data-click-effect
            type="button"
          >
            <Icon name="mic" className="relative" />
          </button>

          <button
            aria-label="Attach files"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-white/10 text-white/82 transition hover:bg-white/16 active:scale-95"
            data-click-effect
            type="button"
          >
            <Icon name="attach" />
          </button>

          <button
            className="h-9 rounded-full border border-white/8 bg-white/10 px-3 text-[12px] font-medium text-white/82 transition hover:bg-white/16"
            type="button"
          >
            gpt-5
          </button>
        </div>
      </div>
    </div>
  )
}
