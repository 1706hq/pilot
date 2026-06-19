import type { SVGProps } from "react"

const svgProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.5,
} as const

export const Icons = {
  minimizeWin: (props: SVGProps<SVGSVGElement>) => (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M1 5h8" {...svgProps} />
    </svg>
  ),
  maximizeWin: (props: SVGProps<SVGSVGElement>) => (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden {...props}>
      <rect x="1.5" y="1.5" width="7" height="7" rx="0.5" {...svgProps} />
    </svg>
  ),
  maximizeRestoreWin: (props: SVGProps<SVGSVGElement>) => (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M3 3V1.5h5.5V7H7" {...svgProps} />
      <rect x="1.5" y="3" width="5.5" height="5.5" rx="0.5" {...svgProps} />
    </svg>
  ),
  closeWin: (props: SVGProps<SVGSVGElement>) => (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" {...svgProps} />
    </svg>
  ),
  closeMac: (props: SVGProps<SVGSVGElement>) => (
    <svg width="6" height="6" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M2 2 8 8M8 2 2 8" {...svgProps} strokeWidth={2} />
    </svg>
  ),
  minMac: (props: SVGProps<SVGSVGElement>) => (
    <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M2 5h6" {...svgProps} strokeWidth={2} />
    </svg>
  ),
  fullMac: (props: SVGProps<SVGSVGElement>) => (
    <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M2 8 8 2M5 2h3v3M5 8H2V5" {...svgProps} strokeWidth={1.7} />
    </svg>
  ),
  plusMac: (props: SVGProps<SVGSVGElement>) => (
    <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden {...props}>
      <path d="M5 1.8v6.4M1.8 5h6.4" {...svgProps} strokeWidth={1.8} />
    </svg>
  ),
}
