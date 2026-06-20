"use client"

/**
 * The conversation transcript shown in the centre column once a chat starts.
 * Both sides sit in chat bubbles — the user's on the right, PILOT's on the left
 * (no agent label). Text reveals word-by-word with a blur-in (the Aceternity
 * "text generate" effect): user messages stagger in; PILOT's words blur in as
 * they stream. The scroll is contained to this area and stops above the
 * composer.
 */

import { useEffect, useRef } from "react"
import { motion } from "motion/react"

import { cn } from "~/lib/utils"
import { usePilotStore } from "~/pilot/state/store"
import type { ChatMessage } from "~/pilot/types"

const WORD_EASE = [0.16, 1, 0.3, 1] as const

/**
 * Word-by-word blur-in reveal that preserves light markdown (**bold**, `*`/`-`
 * bullets, blank lines). `stagger` cascades the words for instant (finished)
 * messages; with it off, each word simply blurs in when it mounts — which, for
 * streaming text, means words appear as they arrive.
 */
function RevealText({ text, stagger }: { text: string; stagger: boolean }) {
  const counter = { i: 0 }

  const Word = (w: string, bold: boolean) => {
    const i = counter.i++
    return (
      <motion.span
        key={i}
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{
          duration: 0.4,
          ease: WORD_EASE,
          delay: stagger ? Math.min(i, 40) * 0.045 : 0,
        }}
        className={cn(
          "inline-block whitespace-pre",
          bold && "font-semibold text-white"
        )}
      >
        {w}{" "}
      </motion.span>
    )
  }

  const segmentsToWords = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).flatMap((seg) => {
      const bold = seg.startsWith("**") && seg.endsWith("**")
      const content = bold ? seg.slice(2, -2) : seg
      return content
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .map((w) => Word(w, bold))
    })

  const lines = text.split("\n")
  return (
    <>
      {lines.map((line, li) => {
        if (line.trim() === "") return <div key={li} className="h-2" />
        const trimmed = line.trimStart()
        if (/^[*-]\s+/.test(trimmed)) {
          return (
            <div key={li} className="flex gap-2 pl-1">
              <span className="select-none text-white/35">•</span>
              <span>{segmentsToWords(trimmed.replace(/^[*-]\s+/, ""))}</span>
            </div>
          )
        }
        return (
          <p key={li} className="leading-relaxed">
            {segmentsToWords(line)}
          </p>
        )
      })}
    </>
  )
}

/** ChatGPT/Grok-style "thinking" loader shown before the first token arrives. */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-white/65"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2.5, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

function AssistantTurn({ msg }: { msg: ChatMessage }) {
  const thinking = msg.streaming && msg.content.trim() === ""
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.055] px-4 py-3 text-[14.5px] leading-relaxed text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
        {thinking ? <ThinkingDots /> : <RevealText text={msg.content} stagger={false} />}
      </div>
    </div>
  )
}

function UserTurn({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-white/10 px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
        <RevealText text={msg.content} stagger />
      </div>
    </div>
  )
}

export function Transcript() {
  const conversation = usePilotStore((s) => s.conversation)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Keep pinned to the latest message — scrolls only this container.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [conversation])

  return (
    <div
      ref={scrollRef}
      className="model-picker-scroll h-full overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-1 pb-6">
        {conversation.map((msg) =>
          msg.role === "user" ? (
            <UserTurn key={msg.id} msg={msg} />
          ) : (
            <AssistantTurn key={msg.id} msg={msg} />
          )
        )}
      </div>
    </div>
  )
}
