import { cn } from "@/lib/cn";

/**
 * Two-tone icons for the shop workspace (sidebar, menu and main actions). Drawn on a 24×24 grid
 * with `currentColor` lines; fills come from CSS variables (see `.shop-ic` in globals.css) so the
 * same icon works inactive, active (brand tint) and on a blue button (`inverse`). Each icon has
 * one small hover movement, triggered by the nearest `.group`.
 */
type Props = { className?: string; active?: boolean; inverse?: boolean };

function Svg({ className, active, inverse, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-active={active || undefined}
      data-inverse={inverse || undefined}
      className={cn("shop-ic size-5 shrink-0 overflow-visible", className)}
    >
      {children}
    </svg>
  );
}

const fill = "var(--ic-fill)";
const accent = "var(--ic-accent)";
const paper = "var(--ic-paper)";

/** Overview: a card with bars that grow on hover. */
export function IcOverview(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="4.5" fill={fill} />
      <rect x="6.6" y="12.5" width="2.6" height="5" rx="1.3" fill={accent} stroke="none" className="ic-bar ic-bar-1" />
      <rect x="10.7" y="9.5" width="2.6" height="8" rx="1.3" fill={accent} stroke="none" className="ic-bar ic-bar-2" />
      <rect x="14.8" y="6.5" width="2.6" height="11" rx="1.3" fill={accent} stroke="none" className="ic-bar ic-bar-3" />
    </Svg>
  );
}

/** Orders: a tray with a document that drops in on hover. */
export function IcOrders(p: Props) {
  return (
    <Svg {...p}>
      <g className="ic-drop">
        <path d="M8 11.5V3.8a.8.8 0 0 1 .8-.8h6.4a.8.8 0 0 1 .8.8v7.7" fill={paper} />
        <path d="M10.2 6h3.6M10.2 8.4h2.4" strokeWidth="1.5" />
      </g>
      <path d="M3 13.5 5 8.3A2 2 0 0 1 6.9 7H8m8 0h1.1a2 2 0 0 1 1.9 1.3l2 5.2V18a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18v-4.5Z" fill={fill} />
      <path d="M3 13.5h4.6l1.4 2.4h6l1.4-2.4H21" />
    </Svg>
  );
}

/** Printing queue: a stack of sheets with a timer badge; the top sheet slides on hover. */
export function IcQueue(p: Props) {
  return (
    <Svg {...p}>
      <rect x="7.5" y="2.8" width="11" height="13.5" rx="2" fill={fill} className="ic-back" />
      <g className="ic-front">
        <rect x="4.5" y="5.8" width="11" height="13.5" rx="2" fill={paper} />
        <path d="M7.5 10h5M7.5 13h3.5" strokeWidth="1.5" />
      </g>
      <circle cx="17.5" cy="17.5" r="4.2" fill={accent} stroke="none" />
      <path d="M17.5 15.6v2l1.3 1" stroke={paper} strokeWidth="1.5" className="ic-hand" />
    </Svg>
  );
}

/** Printers: a printer whose page slides out on hover. */
export function IcPrinter(p: Props) {
  return (
    <Svg {...p}>
      <path d="M7 8.5V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v4.5" fill={paper} />
      <rect x="2.8" y="8.5" width="18.4" height="9" rx="2.6" fill={fill} />
      <circle cx="17.6" cy="11.6" r="1.1" fill={accent} stroke="none" className="ic-led" />
      <g className="ic-paper">
        <path d="M7 14.5h10v5.7a.8.8 0 0 1-.8.8H7.8a.8.8 0 0 1-.8-.8v-5.7Z" fill={paper} />
        <path d="M9.5 17.5h5" strokeWidth="1.5" />
      </g>
    </Svg>
  );
}

/** Pricing: a rupee price tag that swings from its hole on hover. */
export function IcPricing(p: Props) {
  return (
    <Svg {...p}>
      <g className="ic-swing">
        <path d="M3 11.6V4.8A1.8 1.8 0 0 1 4.8 3h6.8a1.8 1.8 0 0 1 1.3.5l7.6 7.6a1.8 1.8 0 0 1 0 2.6l-6.8 6.8a1.8 1.8 0 0 1-2.6 0l-7.6-7.6a1.8 1.8 0 0 1-.5-1.3Z" fill={fill} />
        <circle cx="7.4" cy="7.4" r="1.4" fill={accent} stroke="none" />
        <path d="M10.6 10.4h4.6M10.6 12.4h4.6M12 10.4c2.2 0 2.2 4 0 4h-1.4l3.4 3.2" strokeWidth="1.5" />
      </g>
    </Svg>
  );
}

/** Settings: sliders whose knobs move on hover. */
export function IcSettings(p: Props) {
  return (
    <Svg {...p}>
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="4.5" fill={fill} stroke="none" />
      <path d="M6 8h12M6 16h12" />
      <circle cx="15" cy="8" r="2.3" fill={accent} className="ic-knob-a" />
      <circle cx="9" cy="16" r="2.3" fill={accent} className="ic-knob-b" />
    </Svg>
  );
}

/** Hand over: a pickup QR in a viewfinder, with a scan line on hover. */
export function IcHandover(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.8" fill={fill} strokeWidth="1.5" />
      <path d="M9 9h2v2H9zM13 9h2v2h-2zM9 13h2v2H9zM13.5 13.5h1v1h-1z" fill={accent} stroke="none" />
      <path d="M4.5 12h15" stroke={accent} strokeWidth="1.6" className="ic-scan" />
    </Svg>
  );
}

/** Accept: a document with a tick that pops on hover. */
export function IcAccept(p: Props) {
  return (
    <Svg {...p}>
      <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill={paper} />
      <path d="M14 3v4h4" />
      <g className="ic-pop">
        <circle cx="16.5" cy="16.5" r="4.5" fill={accent} stroke="none" />
        <path d="m14.6 16.6 1.3 1.3 2.5-2.6" stroke={paper} strokeWidth="1.6" />
      </g>
    </Svg>
  );
}

/** Ready for pickup: a parcel with a tick. */
export function IcReady(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.5 8 12 3.5 20.5 8v8.5L12 21l-8.5-4.5Z" fill={fill} />
      <path d="M3.5 8 12 12.5 20.5 8M12 12.5V21" />
      <g className="ic-pop">
        <circle cx="18" cy="18" r="4" fill={accent} stroke="none" />
        <path d="m16.3 18 1.2 1.2 2.2-2.3" stroke={paper} strokeWidth="1.6" />
      </g>
    </Svg>
  );
}

/** Add: a plus inside a soft square that turns on hover. */
export function IcAdd(p: Props) {
  return (
    <Svg {...p}>
      <g className="ic-turn">
        <rect x="3" y="3" width="18" height="18" rx="5" fill={fill} />
        <path d="M12 8v8M8 12h8" />
      </g>
    </Svg>
  );
}
