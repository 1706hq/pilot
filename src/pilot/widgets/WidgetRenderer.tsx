"use client"

/**
 * Renders a single widget spec. Maps `type` to a vetted component and wraps it
 * in the glowing frame tinted by the owning agent — that frame's entrance sweep
 * is the "UI appears on the fly" reveal.
 */

import { motion } from "motion/react"

import BorderGlow from "~/components/BorderGlow"
import { agentAccent } from "~/pilot/agents/agents"
import { Chart } from "~/pilot/widgets/charts"
import {
  FileCard,
  LinkCard,
  StatCard,
  TableCard,
} from "~/pilot/widgets/cards"
import { InvoiceCard } from "~/pilot/widgets/invoice"
import { DocumentCard } from "~/pilot/widgets/document"
import type {
  FileCardSpec,
  InnerWidgetSpec,
  WidgetSpec,
} from "~/pilot/widgets/types"
import type { AgentId } from "~/pilot/types"

function InnerWidget({
  spec,
  onDownload,
}: {
  spec: InnerWidgetSpec
  onDownload?: (spec: FileCardSpec) => void
}) {
  switch (spec.type) {
    case "stat":
      return <StatCard spec={spec} />
    case "chart":
      return <Chart spec={spec} />
    case "table":
      return <TableCard spec={spec} />
    case "link":
      return <LinkCard spec={spec} />
    case "file":
      return <FileCard spec={spec} onDownload={onDownload} />
    default:
      return null
  }
}

function Frame({
  agent,
  children,
}: {
  agent: AgentId
  children: React.ReactNode
}) {
  const accent = agentAccent(agent)
  return (
    <BorderGlow
      interactive={false}
      animated
      glowIntensity={0.7}
      glowRadius={30}
      borderRadius={20}
      backgroundColor="rgba(8,12,22,0.72)"
      colors={[accent, accent, accent]}
    >
      <div className="p-4">{children}</div>
    </BorderGlow>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="mb-2.5 text-[12.5px] font-semibold text-white/90">
      {children}
    </div>
  )
}

export function WidgetCard({
  widget,
  onDownload,
}: {
  widget: WidgetSpec
  onDownload?: (spec: FileCardSpec) => void
}) {
  // The invoice is a light "paper" card — it stands on its own, no dark frame.
  if (widget.type === "invoice") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <InvoiceCard spec={widget} />
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <Frame agent={widget.agent}>
        {widget.type === "document" ? (
          <DocumentCard spec={widget} />
        ) : widget.type === "dashboard" ? (
          <>
            <Title>{widget.title}</Title>
            <div className="grid grid-cols-2 gap-3">
              {widget.children.map((child, i) => (
                <div
                  key={i}
                  className={
                    child.type === "chart" ||
                    child.type === "table" ||
                    child.type === "file" ||
                    child.type === "link"
                      ? "col-span-2 rounded-xl bg-white/[0.03] p-3"
                      : "rounded-xl bg-white/[0.03] p-3"
                  }
                >
                  {child.type === "chart" || child.type === "table" ? (
                    <Title>{child.title}</Title>
                  ) : null}
                  <InnerWidget spec={child} onDownload={onDownload} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {widget.type === "chart" || widget.type === "table" ? (
              <Title>{widget.title}</Title>
            ) : null}
            <InnerWidget spec={widget} onDownload={onDownload} />
          </>
        )}
      </Frame>
    </motion.div>
  )
}
