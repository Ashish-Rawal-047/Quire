import { cn } from "@/lib/cn";

/**
 * Two-tone illustrated icons for Quire's key choices. Drawn on a 48×48 grid in the brand blue
 * with light-blue fills; `inverse` redraws them in white for use on blue backgrounds.
 */
type IconProps = { className?: string; inverse?: boolean };

function palette(inverse?: boolean) {
  return inverse
    ? { line: "#ffffff", fill: "rgb(255 255 255 / 0.22)", paper: "#ffffff", accent: "#ffffff", ink: "var(--brand)" }
    : { line: "var(--brand)", fill: "var(--brand-tint-strong)", paper: "#ffffff", accent: "var(--brand)", ink: "#ffffff" };
}

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={cn("size-12 shrink-0", className)}>
      {children}
    </svg>
  );
}

/** Customer: a phone sending a document. */
export function IconCustomer({ className, inverse }: IconProps) {
  const c = palette(inverse);
  return (
    <Svg className={className}>
      <rect x="9" y="5" width="22" height="38" rx="5" fill={c.fill} stroke={c.line} strokeWidth="2" />
      <rect x="14" y="12" width="12" height="15" rx="1.5" fill={c.paper} stroke={c.line} strokeWidth="1.6" />
      <path d="M17 17h6M17 20.5h6M17 24h3.5" stroke={c.line} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 38h6" stroke={c.line} strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="31" r="8" fill={c.accent} />
      <path d="M34 35v-7.5M30.8 30.6 34 27.4l3.2 3.2" stroke={c.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Shop owner: a storefront with a striped awning and a printer in the window. */
export function IconShop({ className, inverse }: IconProps) {
  const c = palette(inverse);
  return (
    <Svg className={className}>
      <path d="M8 20v20a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V20" fill={c.paper} stroke={c.line} strokeWidth="2" />
      <path d="M6 12l3-6h30l3 6v4a4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-4 4 2 2 0 0 1-2-2v-6Z" fill={c.fill} stroke={c.line} strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 6l-2 10M30 6l2 10M24 6v10" stroke={c.line} strokeWidth="1.6" />
      <rect x="12" y="25" width="13" height="9" rx="2" fill={c.fill} stroke={c.line} strokeWidth="1.6" />
      <path d="M15 25v-2.5h7V25M15 34v2h7v-2" stroke={c.line} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M29 42V27a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v15" stroke={c.line} strokeWidth="2" />
      <circle cx="33.5" cy="34.5" r="1" fill={c.line} />
    </Svg>
  );
}

/** Find by name: a magnifier over a list of shops. */
export function IconFindByName({ className, inverse }: IconProps) {
  const c = palette(inverse);
  return (
    <Svg className={className}>
      <rect x="6" y="8" width="26" height="30" rx="4" fill={c.paper} stroke={c.line} strokeWidth="2" />
      <circle cx="12" cy="16" r="2" fill={c.accent} />
      <path d="M17 16h10M12 23h15M12 30h9" stroke={c.line} strokeWidth="2" strokeLinecap="round" />
      <circle cx="31" cy="29" r="8" fill={c.fill} stroke={c.line} strokeWidth="2.4" />
      <path d="m37 35 5.5 5.5" stroke={c.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M27.5 27.5a4 4 0 0 1 3.5-2.5" stroke={c.line} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Find by code: a ticket stub with a code on it. */
export function IconShopCode({ className, inverse }: IconProps) {
  const c = palette(inverse);
  return (
    <Svg className={className}>
      <path
        d="M5 15a3 3 0 0 1 3-3h32a3 3 0 0 1 3 3v4a5 5 0 0 0 0 10v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4a5 5 0 0 0 0-10v-4Z"
        fill={c.paper}
        stroke={c.line}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M31 13v22" stroke={c.line} strokeWidth="1.6" strokeDasharray="2.5 2.5" />
      <path d="M13 20.5h10M12 27.5h10M16 17l-2 14M21 17l-2 14" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="34.5" y="19" width="5" height="10" rx="2.5" fill={c.fill} stroke={c.line} strokeWidth="1.6" />
    </Svg>
  );
}

/** Scan a QR code: a code inside viewfinder brackets with a scan line. */
export function IconScanQr({ className, inverse, animated }: IconProps & { animated?: boolean }) {
  const c = palette(inverse);
  return (
    <Svg className={className}>
      <path d="M6 15V9a3 3 0 0 1 3-3h6M33 6h6a3 3 0 0 1 3 3v6M42 33v6a3 3 0 0 1-3 3h-6M15 42H9a3 3 0 0 1-3-3v-6" stroke={c.line} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="12" y="12" width="24" height="24" rx="3" fill={c.paper} stroke={c.line} strokeWidth="1.6" />
      <rect x="15" y="15" width="7" height="7" rx="1" fill={c.accent} />
      <rect x="26" y="15" width="7" height="7" rx="1" fill={c.accent} />
      <rect x="15" y="26" width="7" height="7" rx="1" fill={c.accent} />
      <path d="M27 27h2v2h-2zM31 31h2v2h-2zM27 31h2v2h-2zM31 27h2v2h-2z" fill={c.line} />
      <rect x="8" y="23" width="32" height="2.2" rx="1.1" fill={inverse ? "#ffffff" : "#38b2cc"} className={animated ? "icon-scan-line" : undefined} />
    </Svg>
  );
}

/** Orders: a receipt with a tick. */
export function IconReceipt({ className, inverse }: IconProps) {
  const c = palette(inverse);
  return (
    <Svg className={className}>
      <path d="M11 5h22a2 2 0 0 1 2 2v36l-4-3-4 3-4-3-4 3-4-3-4 3V7a2 2 0 0 1 2-2Z" fill={c.paper} stroke={c.line} strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 13h14M15 19h14M15 25h8" stroke={c.line} strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="32" r="8" fill={c.accent} />
      <path d="m30.5 32 2.5 2.5 4.5-5" stroke={c.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
