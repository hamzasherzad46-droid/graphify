import type { ReactNode, SVGProps } from 'react'

/** Line icons drawn for Atlas: 1.5px strokes, slightly irregular like an engraving. */
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

export const TodayIcon = () => (
  <svg {...base()}>
    <path d="M4.5 9.5h15M8 3.5v3M16 3.5v3" />
    <rect x="4.5" y="5.5" width="15" height="14.5" rx="2" />
    <path d="M9 14.2l2 2 4-4.4" />
  </svg>
)

export const AtlasIcon = () => (
  <svg {...base()}>
    <path d="M4 5.2c2.7-1 5.3-1 8 .6 2.7-1.6 5.3-1.6 8-.6v13.6c-2.7-1-5.3-1-8 .6-2.7-1.6-5.3-1.6-8-.6z" />
    <path d="M12 5.8v14" />
  </svg>
)

export const PracticeIcon = () => (
  <svg {...base()}>
    <rect x="3" y="7" width="18" height="11" rx="2" />
    <path d="M6.5 10.5h1M10 10.5h1M13.5 10.5h1M17 10.5h.5M8 14.5h8" />
  </svg>
)

export const ProgressIcon = () => (
  <svg {...base()}>
    <path d="M4 19.5h16" />
    <path d="M6.5 16v-4M10.5 16V8M14.5 16v-6M18.5 16V5" />
  </svg>
)

export const YouIcon = () => (
  <svg {...base()}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 20c1.1-3.6 3.9-5.3 7-5.3s5.9 1.7 7 5.3" />
  </svg>
)

export const ChevronIcon = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)} className="flip-rtl">
    <path d="m9.5 6 6 6-6 6" />
  </svg>
)

export const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </svg>
)

export const FlameIcon = ({ size = 20 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.4-5.2 3.5-8.4.9 1.4 1.4 2.7 1.4 4 1.7-1.1 2.8-3.4 2.5-6.5 3.4 2.5 5.6 6.2 5.6 10.4 0 3.8-2.6 6.6-6.5 6.6z" />
    <path d="M12 21c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.3-2.5 1.8-3.9 1.8 1.1 3.6 2.4 3.6 4.1 0 1.4-1.1 2.4-2.7 2.4z" />
  </svg>
)

export const CardsIcon = ({ size = 22 }: { size?: number }) => (
  <svg {...base(size)}>
    <rect x="7" y="4" width="12" height="15" rx="2" />
    <path d="M5 7.5v11a2 2 0 0 0 2 2h8.5" />
  </svg>
)

export const ClockIcon = ({ size = 22 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9.5V13l2.4 1.6M10 3h4" />
  </svg>
)

export const CubeIcon = ({ size = 22 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M12 3.2 19.8 7.6v8.8L12 20.8l-7.8-4.4V7.6z" />
    <path d="M4.2 7.6 12 12l7.8-4.4M12 12v8.8" />
  </svg>
)

export const RedoIcon = ({ size = 22 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M19 12a7 7 0 1 1-2.2-5.1" />
    <path d="M19 4.5v4h-4" />
  </svg>
)

/* ---------- System glyphs (larger, more drawn) ---------- */

const glyphBase = (size: number): SVGProps<SVGSVGElement> => ({ ...base(size), viewBox: '0 0 40 40', strokeWidth: 1.4 })

const GLYPHS: Record<string, ReactNode> = {
  bone: (
    <>
      <path d="M11.5 27.8c-1.6 2.6-5.6 2.1-6.1-.9-.3-1.8.8-3.4 2.4-3.9-1.2-1.7-.6-4.1 1.4-4.8 2.1-.8 4.2.8 4.2 3l9.8-9.8c-2.2 0-3.8-2.1-3-4.2.7-2 3.1-2.6 4.8-1.4.5-1.6 2.1-2.7 3.9-2.4 3 .5 3.5 4.5.9 6.1 2.4.6 3.1 3.6 1.3 5.2-1.4 1.2-3.5 1-4.6-.4l-9.8 9.8c1.4 1.1 1.6 3.2.4 4.6-1.6 1.8-4.6 1.1-5.2-1.3z" />
    </>
  ),
  muscle: (
    <>
      <path d="M7 31c3-1.5 4.5-4.5 5.3-8.4.9-4.5 1.5-9.4 5.7-12.8 3.7-3 9-3.6 12.5-1.8" />
      <path d="M10.3 33c5.2.3 10-1.6 13.3-5.5 3.3-3.9 4.4-9.4 3.7-14.5" />
      <path d="M15 22.5c2.5.8 5 .6 7.4-.6M16.5 17.2c2.1.6 4.3.4 6.4-.6M13.8 27.2c2.3.8 4.6.7 6.8-.2" />
    </>
  ),
  heart: (
    <>
      <path d="M20 33c-6.5-3.5-12-8.6-12-15.2 0-4.1 3-7.3 6.8-7.3 2.4 0 4.1 1.1 5.2 2.9 1.1-1.8 2.8-2.9 5.2-2.9 3.8 0 6.8 3.2 6.8 7.3 0 6.6-5.5 11.7-12 15.2z" />
      <path d="M17 11.3V6.5c0-1.2 1-2 2.1-2M23 11V5.2M23 7.4c1.6-1.7 3.8-2.2 5.6-1.6" />
      <path d="M20 13.5c-.6 4.5-2.8 8.7-6.3 11.7" />
    </>
  ),
  lungs: (
    <>
      <path d="M20 5v12M20 17c-1.3 1.3-3.3 2.3-4.8 2.6M20 17c1.3 1.3 3.3 2.3 4.8 2.6" />
      <path d="M15.6 12.4c-4.2.8-7.6 6.6-8 13.4-.2 3.4 1.2 5.3 3.8 5.3 3 0 6.2-1.3 6.2-4.8V13.6c0-.9-.9-1.4-2-1.2z" />
      <path d="M24.4 12.4c4.2.8 7.6 6.6 8 13.4.2 3.4-1.2 5.3-3.8 5.3-3 0-6.2-1.3-6.2-4.8V13.6c0-.9.9-1.4 2-1.2z" />
    </>
  ),
  brain: (
    <>
      <path d="M19.5 8.2c-1.8-2.2-5.6-2.3-7.5-.2-2.9-.3-5.2 2.2-4.8 5-2.3 1.4-3 4.6-1.3 6.8-1.2 2.7.3 5.9 3.2 6.5.6 2.7 3.5 4.3 6.1 3.4 1.5 1.6 4.1 1.7 5.6.1" />
      <path d="M20.5 8.2c1.8-2.2 5.6-2.3 7.5-.2 2.9-.3 5.2 2.2 4.8 5 2.3 1.4 3 4.6 1.3 6.8 1.2 2.7-.3 5.9-3.2 6.5-.6 2.7-3.5 4.3-6.1 3.4" />
      <path d="M20 8v24.5M14 13.5c1.8.2 3 1.4 3.2 3.2M12 20.2c2.2-.6 4.4.4 5.3 2.4M26 13.5c-1.8.2-3 1.4-3.2 3.2M28 20.2c-2.2-.6-4.4.4-5.3 2.4M25.5 29.6c-.4 1.5-.2 3 .8 4.3" />
    </>
  ),
  stomach: (
    <>
      <path d="M17 4.5v5c0 2.5-1.6 3.6-3.6 4.6-3.6 1.8-5.9 5.4-5.9 9.6 0 6 4.8 10.8 10.8 10.8 5.5 0 9.8-3.5 11.8-8.4 1.3-3.2 1.4-6.8-.4-9.6-1.6-2.4-4.6-3.1-6.6-1.4-1.6 1.4-1.9 3.6-3.6 4.2" />
      <path d="M21.5 4.5v5.7M29.3 25.8c1.7.4 3 1.4 3.6 3.2" />
    </>
  ),
  kidney: (
    <>
      <path d="M17.2 9c-3.6-3.8-10.2-1.4-10.5 5-.3 5.4 2.5 12.6 7.7 13.4 3.5.5 5.1-2.2 4.2-5-.9-2.7-.2-4.7 1-6.2 1.7-2.3.4-4.9-2.4-7.2z" />
      <path d="M17.5 17.3c1.8.6 3.4 2.4 4.1 5 .9 3.4 1.2 7 3.2 10.2M27 31v3.3" />
    </>
  ),
  reproductive: (
    <>
      <circle cx="15" cy="23" r="7.2" />
      <path d="M20.4 18.2 30 8.6M24.2 8.4H30v5.8" />
      <path d="M15 30.2V35M12.3 33h5.4" />
    </>
  ),
}

export function SystemGlyph({ glyph, size = 34 }: { glyph: string; size?: number }) {
  return <svg {...glyphBase(size)}>{GLYPHS[glyph] ?? GLYPHS.bone}</svg>
}
