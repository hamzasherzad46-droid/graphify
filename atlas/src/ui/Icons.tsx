import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({ width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p })

export const SearchIcon = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>)
export const MenuIcon = (p: P) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>)
export const CloseIcon = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>)
export const LabelIcon = (p: P) => (<svg {...base(p)}><circle cx="6" cy="17" r="1.6" /><path d="M7.2 15.8L12 11h8" /><path d="M14 7h6" /></svg>)
export const GhostIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="7.5" strokeDasharray="2.2 2.4" /><circle cx="12" cy="12" r="2.5" /></svg>)
export const ResetIcon = (p: P) => (<svg {...base(p)}><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="5.5" /></svg>)
export const FocusIcon = (p: P) => (<svg {...base(p)}><path d="M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4" /><circle cx="12" cy="12" r="2.2" /></svg>)
export const IsolateIcon = (p: P) => (<svg {...base(p)}><rect x="8" y="8" width="8" height="8" rx="1" /><path d="M3 3l3 3M21 3l-3 3M3 21l3-3M21 21l-3-3" /></svg>)
export const HideIcon = (p: P) => (<svg {...base(p)}><path d="M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2" /><path d="M4 20L20 4" /></svg>)
export const FlagIcon = (p: P) => (<svg {...base(p)}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>)
export const ChevronIcon = (p: P) => (<svg {...base(p)}><path d="M6 15l6-6 6 6" /></svg>)
export const ExplodeIcon = (p: P) => (<svg {...base(p)}><rect x="9.5" y="9.5" width="5" height="5" rx="0.8" /><path d="M4 4l3.5 3.5M20 4l-3.5 3.5M4 20l3.5-3.5M20 20l-3.5-3.5" /><path d="M4 7.5V4h3.5M20 7.5V4h-3.5M4 16.5V20h3.5M20 16.5V20h-3.5" /></svg>)
export const InfoIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></svg>)
