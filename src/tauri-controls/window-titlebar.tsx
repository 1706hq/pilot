"use client"

import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react"

import TauriAppWindowContext from "./contexts/plugin-window"
import {
  getOsType,
  platformFromOsType,
  type SupportedPlatform,
} from "./libs/plugin-os"
import { cn } from "./libs/utils"
import type { WindowTitlebarProps } from "./types"
import { WindowControls } from "./window-controls"

const titlebarStyle: CSSProperties = {
  alignItems: "center",
  background: "transparent",
  color: "#f8fafc",
  display: "flex",
  flexDirection: "row",
  height: 32,
  left: 0,
  overflow: "hidden",
  position: "fixed",
  right: 0,
  top: 0,
  userSelect: "none",
  zIndex: 200,
}

export function WindowTitlebar({
  children,
  controlsOrder = "system",
  className,
  style,
  windowControlsProps,
  ...props
}: WindowTitlebarProps) {
  const { isTauriWindow } = useContext(TauriAppWindowContext)
  const [detectedPlatform, setDetectedPlatform] =
    useState<SupportedPlatform>("windows")

  useEffect(() => {
    let mounted = true

    getOsType().then((osType) => {
      if (mounted) setDetectedPlatform(platformFromOsType(osType))
    })

    return () => {
      mounted = false
    }
  }, [])

  const activePlatform = windowControlsProps?.platform ?? detectedPlatform
  const shouldPlaceLeft =
    controlsOrder === "left" ||
    (controlsOrder === "platform" && activePlatform === "macos") ||
    (controlsOrder === "system" && detectedPlatform === "macos")

  const controlsProps = useMemo(
    () => ({
      ...windowControlsProps,
      justify: false,
      style: {
        marginLeft: shouldPlaceLeft ? 0 : "auto",
        ...windowControlsProps?.style,
      },
    }),
    [shouldPlaceLeft, windowControlsProps]
  )

  if (!isTauriWindow) return null

  return (
    <div
      className={cn("tauri-titlebar", className)}
      data-tauri-drag-region
      style={{ ...titlebarStyle, ...style }}
      {...props}
    >
      {shouldPlaceLeft ? (
        <>
          <WindowControls {...controlsProps} />
          {children}
        </>
      ) : (
        <>
          {children}
          <WindowControls {...controlsProps} />
        </>
      )}
    </div>
  )
}
