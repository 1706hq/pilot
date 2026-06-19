import type { HTMLProps, ReactNode } from "react"

import type { SupportedPlatform } from "./libs/plugin-os"

export interface WindowControlsProps extends HTMLProps<HTMLDivElement> {
  platform?: SupportedPlatform
  justify?: boolean
  hide?: boolean
  hideMethod?: "display" | "visibility"
}

export interface WindowTitlebarProps extends HTMLProps<HTMLDivElement> {
  children?: ReactNode
  controlsOrder?: "left" | "right" | "platform" | "system"
  windowControlsProps?: WindowControlsProps
}
