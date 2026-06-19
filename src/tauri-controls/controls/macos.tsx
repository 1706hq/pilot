"use client"

import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLProps,
} from "react"

import { Button } from "../components/button"
import { Icons } from "../components/icons"
import TauriAppWindowContext from "../contexts/plugin-window"
import { cn } from "../libs/utils"

const containerStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 8,
  height: 32,
  padding: "0 12px",
}

const dotStyle: CSSProperties = {
  border: "1px solid rgba(0,0,0,.12)",
  borderRadius: 999,
  color: "rgba(0,0,0,.62)",
  height: 12,
  width: 12,
}

export function MacOS({ className, style, ...props }: HTMLProps<HTMLDivElement>) {
  const { minimizeWindow, maximizeWindow, fullscreenWindow, closeWindow } =
    useContext(TauriAppWindowContext)
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const handleAltKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") setIsAltKeyPressed(true)
    }
    const handleAltKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") setIsAltKeyPressed(false)
    }

    window.addEventListener("keydown", handleAltKeyDown)
    window.addEventListener("keyup", handleAltKeyUp)

    return () => {
      window.removeEventListener("keydown", handleAltKeyDown)
      window.removeEventListener("keyup", handleAltKeyUp)
    }
  }, [])

  const fullIcon = useMemo(
    () => (isAltKeyPressed ? <Icons.plusMac /> : <Icons.fullMac />),
    [isAltKeyPressed]
  )

  return (
    <div
      className={cn("tauri-controls-macos", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ ...containerStyle, ...style }}
      {...props}
    >
      <Button
        aria-label="Close window"
        onClick={closeWindow}
        style={{ ...dotStyle, background: "#ff544d" }}
      >
        {isHovering && <Icons.closeMac />}
      </Button>
      <Button
        aria-label="Minimize window"
        onClick={minimizeWindow}
        style={{ ...dotStyle, background: "#ffbd2e" }}
      >
        {isHovering && <Icons.minMac />}
      </Button>
      <Button
        aria-label={isAltKeyPressed ? "Maximize window" : "Enter fullscreen"}
        onClick={isAltKeyPressed ? maximizeWindow : fullscreenWindow}
        style={{ ...dotStyle, background: "#28c93f" }}
      >
        {isHovering && fullIcon}
      </Button>
    </div>
  )
}
