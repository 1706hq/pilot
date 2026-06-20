"use client";
import { cn } from "~/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

type SidebarSide = "left" | "right";

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  side: SidebarSide;
  widthOpen: number;
  widthClosed: number;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  side = "left",
  widthOpen = 260,
  widthClosed = 68,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  side?: SidebarSide;
  widthOpen?: number;
  widthClosed?: number;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, animate, side, widthOpen, widthClosed }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  side,
  widthOpen,
  widthClosed,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  side?: SidebarSide;
  widthOpen?: number;
  widthClosed?: number;
}) => {
  return (
    <SidebarProvider
      open={open}
      setOpen={setOpen}
      animate={animate}
      side={side}
      widthOpen={widthOpen}
      widthClosed={widthClosed}
    >
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, side, widthOpen, widthClosed } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "hidden h-full shrink-0 bg-black/55 px-3 pb-4 pt-10 text-white backdrop-blur-2xl md:flex md:flex-col",
          side === "right" ? "border-l border-white/10" : "border-r border-white/10",
          className
        )}
        animate={{
          width: animate
            ? open
              ? `${widthOpen}px`
              : `${widthClosed}px`
            : `${widthOpen}px`,
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen, side } = useSidebar();
  const offscreen = side === "right" ? "100%" : "-100%";
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between border-b border-white/10 bg-black/40 text-white backdrop-blur-2xl w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-white/80"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: offscreen, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: offscreen, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-black/80 text-white p-10 z-[100] flex flex-col justify-between backdrop-blur-2xl",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-white/80"
                onClick={() => setOpen(!open)}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        className
      )}
      {...props}
    >
      {link.icon}

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-white/80 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </a>
  );
};
