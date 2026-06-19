import type { OsType } from "@tauri-apps/plugin-os"

export type SupportedPlatform = "windows" | "macos" | "gnome"
export type SupportedOsType = OsType | "unknown"

export async function getOsType(): Promise<SupportedOsType> {
  if (typeof window === "undefined") return "unknown"

  try {
    const os = await import("@tauri-apps/plugin-os")
    return os.type()
  } catch {
    return getBrowserOsType()
  }
}

export function platformFromOsType(osType: SupportedOsType): SupportedPlatform {
  switch (osType) {
    case "macos":
      return "macos"
    case "linux":
      return "gnome"
    default:
      return "windows"
  }
}

function getBrowserOsType(): SupportedOsType {
  const platform =
    typeof navigator !== "undefined"
      ? `${navigator.platform} ${navigator.userAgent}`.toLowerCase()
      : ""

  if (platform.includes("mac")) return "macos"
  if (platform.includes("linux")) return "linux"
  if (platform.includes("win")) return "windows"

  return "unknown"
}
