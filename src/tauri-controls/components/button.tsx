import type { ButtonHTMLAttributes, CSSProperties } from "react"

import { cn } from "../libs/utils"

const baseStyle: CSSProperties = {
  alignItems: "center",
  appearance: "none",
  border: 0,
  boxShadow: "none",
  cursor: "default",
  display: "inline-flex",
  justifyContent: "center",
  margin: 0,
  outline: 0,
  padding: 0,
  userSelect: "none",
}

export function Button({
  className,
  children,
  style,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("tauri-control-button", className)}
      style={{ ...baseStyle, ...style }}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
