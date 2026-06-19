"use client"

import { useContext, useState, type CSSProperties, type HTMLProps } from "react"

import { Button } from "../components/button"
import { Icons } from "../components/icons"
import TauriAppWindowContext from "../contexts/plugin-window"
import { cn } from "../libs/utils"

const containerStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 8,
  height: 32,
  padding: "0 8px",
}

const buttonStyle: CSSProperties = {
  background: "rgba(255,255,255,.1)",
  borderRadius: 999,
  color: "inherit",
  height: 24,
  width: 24,
}

export function Gnome({ className, style, ...props }: HTMLProps<HTMLDivElement>) {
  const { isWindowMaximized, minimizeWindow, maximizeWindow, closeWindow } =
    useContext(TauriAppWindowContext)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className={cn("tauri-controls-gnome", className)} style={{ ...containerStyle, ...style }} {...props}>
      <Button
        aria-label="Minimize window"
        onClick={minimizeWindow}
        onMouseEnter={() => setHovered("minimize")}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...buttonStyle,
          background: hovered === "minimize" ? "rgba(255,255,255,.18)" : buttonStyle.background,
        }}
      >
        <Icons.minimizeWin />
      </Button>
      <Button
        aria-label={isWindowMaximized ? "Restore window" : "Maximize window"}
        onClick={maximizeWindow}
        onMouseEnter={() => setHovered("maximize")}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...buttonStyle,
          background: hovered === "maximize" ? "rgba(255,255,255,.18)" : buttonStyle.background,
        }}
      >
        {isWindowMaximized ? <Icons.maximizeRestoreWin /> : <Icons.maximizeWin />}
      </Button>
      <Button
        aria-label="Close window"
        onClick={closeWindow}
        onMouseEnter={() => setHovered("close")}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...buttonStyle,
          background: hovered === "close" ? "#e95420" : buttonStyle.background,
        }}
      >
        <Icons.closeWin />
      </Button>
    </div>
  )
}
