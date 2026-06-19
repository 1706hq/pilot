"use client"

import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react"

import TauriAppWindowContext from "./contexts/plugin-window"
import { Gnome, MacOS, Windows } from "./controls"
import {
  getOsType,
  platformFromOsType,
  type SupportedPlatform,
} from "./libs/plugin-os"
import type { WindowControlsProps } from "./types"

export function WindowControls({
  platform,
  justify = false,
  hide = false,
  hideMethod = "display",
  className,
  style,
  ...props
}: WindowControlsProps) {
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

  const selectedPlatform = platform ?? detectedPlatform
  const customStyle = useMemo<CSSProperties>(
    () => ({
      marginLeft: justify ? "auto" : undefined,
      display: hide && hideMethod === "display" ? "none" : undefined,
      visibility: hide && hideMethod === "visibility" ? "hidden" : undefined,
      ...style,
    }),
    [hide, hideMethod, justify, style]
  )

  const controls = (() => {
    if (!isTauriWindow) return null

    switch (selectedPlatform) {
      case "macos":
        return <MacOS className={className} style={customStyle} {...props} />
      case "gnome":
        return <Gnome className={className} style={customStyle} {...props} />
      case "windows":
      default:
        return <Windows className={className} style={customStyle} {...props} />
    }
  })()

  return controls
}
