"use client"

import type { Window } from "@tauri-apps/api/window"
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { getOsType } from "../libs/plugin-os"

interface TauriAppWindowContextType {
  appWindow: Window | null
  isTauriWindow: boolean
  isWindowMaximized: boolean
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  fullscreenWindow: () => Promise<void>
  closeWindow: () => Promise<void>
}

const noop = () => Promise.resolve()

const TauriAppWindowContext = createContext<TauriAppWindowContextType>({
  appWindow: null,
  isTauriWindow: false,
  isWindowMaximized: false,
  minimizeWindow: noop,
  maximizeWindow: noop,
  fullscreenWindow: noop,
  closeWindow: noop,
})

interface TauriAppWindowProviderProps {
  children: ReactNode
}

export function TauriAppWindowProvider({
  children,
}: TauriAppWindowProviderProps) {
  const [appWindow, setAppWindow] = useState<Window | null>(null)
  const [isTauriWindow, setIsTauriWindow] = useState(false)
  const [isWindowMaximized, setIsWindowMaximized] = useState(false)

  useEffect(() => {
    let mounted = true

    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        if (mounted) {
          setAppWindow(getCurrentWindow())
          setIsTauriWindow(true)
        }
      })
      .catch(() => {
        if (mounted) {
          setAppWindow(null)
          setIsTauriWindow(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const updateIsWindowMaximized = useCallback(async () => {
    if (!appWindow) return

    setIsWindowMaximized(await appWindow.isMaximized())
  }, [appWindow])

  useEffect(() => {
    let mounted = true
    let unlisten: (() => void) | undefined

    async function listenForResize() {
      if (!appWindow) return

      const osType = await getOsType()
      if (!mounted || osType === "macos") return

      await updateIsWindowMaximized()
      unlisten = await appWindow.onResized(updateIsWindowMaximized)
    }

    void listenForResize()

    return () => {
      mounted = false
      unlisten?.()
    }
  }, [appWindow, updateIsWindowMaximized])

  const value = useMemo<TauriAppWindowContextType>(
    () => ({
      appWindow,
      isTauriWindow,
      isWindowMaximized,
      minimizeWindow: async () => {
        await appWindow?.minimize()
      },
      maximizeWindow: async () => {
        await appWindow?.toggleMaximize()
      },
      fullscreenWindow: async () => {
        if (!appWindow) return

        await appWindow.setFullscreen(!(await appWindow.isFullscreen()))
      },
      closeWindow: async () => {
        await appWindow?.close()
      },
    }),
    [appWindow, isTauriWindow, isWindowMaximized]
  )

  return (
    <TauriAppWindowContext.Provider value={value}>
      {children}
    </TauriAppWindowContext.Provider>
  )
}

export default TauriAppWindowContext
