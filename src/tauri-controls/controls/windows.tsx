"use client"

import { useContext, useState, type CSSProperties, type HTMLProps } from "react"

import { Button } from "../components/button"
import { Icons } from "../components/icons"
import TauriAppWindowContext from "../contexts/plugin-window"
import { cn } from "../libs/utils"

const containerStyle: CSSProperties = {
  display: "flex",
  height: 32,
}

const buttonStyle: CSSProperties = {
  background: "transparent",
  color: "inherit",
  height: 32,
  width: 46,
}

export function Windows({ className, style, ...props }: HTMLProps<HTMLDivElement>) {
  const { isWindowMaximized, minimizeWindow, maximizeWindow, closeWindow } =
    useContext(TauriAppWindowContext)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className={cn("tauri-controls-windows", className)} style={{ ...containerStyle, ...style }} {...props}>
      <Button
        aria-label="Minimize window"
        onClick={minimizeWindow}
        onMouseEnter={() => setHovered("minimize")}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...buttonStyle,
          background: hovered === "minimize" ? "rgba(0,0,0,.08)" : "transparent",
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
          background: hovered === "maximize" ? "rgba(0,0,0,.08)" : "transparent",
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
          background: hovered === "close" ? "#c42b1c" : "transparent",
          color: hovered === "close" ? "#fff" : "inherit",
        }}
      >
        <Icons.closeWin />
      </Button>
    </div>
  )
}
