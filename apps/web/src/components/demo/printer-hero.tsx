"use client";

import * as React from "react";
import { QuireMark } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

/* ── Pages ─────────────────────────────────────────────────────────────────────────────── */

const LINE = "h-[5px] rounded-full bg-[#0f1b2d]/14";

function Page({ variant }: { variant: number }) {
  const v = variant % 4;
  return (
    <div className="flex h-full w-full flex-col gap-[7px] overflow-hidden rounded-[3px] border border-[#dde5f2] bg-white px-4 pt-4 shadow-[0_2px_6px_rgb(15_27_45/0.08)]">
      {v === 0 ? (
        <>
          <div className="mb-1 flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-[#d2e0ff]" />
            <div className="flex flex-col gap-1.5">
              <div className="h-2 w-20 rounded-full bg-[#0f1b2d]/75" />
              <div className="h-[5px] w-14 rounded-full bg-[#1d4ed8]/60" />
            </div>
          </div>
          {[88, 74, 92, 66].map((w) => (
            <div key={w} className={LINE} style={{ width: `${w}%` }} />
          ))}
          <div className="mt-1 h-[6px] w-12 rounded-full bg-[#1d4ed8]/70" />
          {[90, 82, 70, 86, 60].map((w) => (
            <div key={`b${w}`} className={LINE} style={{ width: `${w}%` }} />
          ))}
        </>
      ) : v === 1 ? (
        <>
          <div className="h-2.5 w-3/4 rounded-full bg-[#0f1b2d]/75" />
          {[92, 80].map((w) => (
            <div key={w} className={LINE} style={{ width: `${w}%` }} />
          ))}
          <div className="mt-1 flex h-20 items-end gap-1.5 rounded-[3px] bg-[#f3f6fd] px-2 pb-2">
            {[40, 65, 52, 82, 70, 94].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: i === 5 ? "#1d4ed8" : "#8fb2ff" }} />
            ))}
          </div>
          {[86, 72, 90].map((w) => (
            <div key={`c${w}`} className={LINE} style={{ width: `${w}%` }} />
          ))}
        </>
      ) : v === 2 ? (
        <>
          <div className="h-24 rounded-[3px] bg-[linear-gradient(135deg,#1d4ed8,#38b2cc_60%,#f3c86b)]" />
          <div className="mt-1 h-2.5 w-2/3 rounded-full bg-[#0f1b2d]/75" />
          {[80, 92, 64].map((w) => (
            <div key={w} className={LINE} style={{ width: `${w}%` }} />
          ))}
        </>
      ) : (
        <>
          <div className="h-2.5 w-1/2 rounded-full bg-[#0f1b2d]/75" />
          <div className="mt-1 grid grid-cols-3 gap-[3px]">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className={cn("h-3.5 rounded-[2px]", i < 3 ? "bg-[#d2e0ff]" : "bg-[#f3f6fd]")} />
            ))}
          </div>
          {[84, 70].map((w) => (
            <div key={w} className={LINE} style={{ width: `${w}%` }} />
          ))}
        </>
      )}
    </div>
  );
}

/* ── Geometry ──────────────────────────────────────────────────────────────────────────── */

const PAGE_W = 190;
const PAGE_H = 268;
const OUT_W = 250;
const OUT_H = 360;
const PAGE_LEFT = (OUT_W - PAGE_W) / 2;
const EMERGE_MS = 2100;
const SWING_MS = 1300;
const DROP_MS = 900;
const CYCLE = 12;

type Sheet = { id: number; variant: number; dx: number; rot: number; level: number };

function FallingSheet({ sheet, onPrinted }: { sheet: Sheet; onPrinted: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const done = React.useRef(onPrinted);
  React.useEffect(() => {
    done.current = onPrinted;
  });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const land = OUT_H - PAGE_H - 4 - sheet.level * 2.5;
    const { dx, rot } = sheet;
    let cancelled = false;
    const emerge = el.animate(
      [
        { transform: "translate(0px, -101%) rotate(0deg)" },
        { transform: "translate(1px, -60%) rotate(0deg)", offset: 0.4 },
        { transform: "translate(-1px, -25%) rotate(0deg)", offset: 0.75 },
        { transform: "translate(0px, 0%) rotate(0deg)" },
      ],
      { duration: EMERGE_MS, easing: "linear", fill: "forwards" },
    );
    // Once it's out, the page hangs from the slot and swings like a pendulum, losing a little
    // height on each swing, before the rollers let go.
    const swingDir = rot >= 0 ? 1 : -1;
    emerge.finished
      .then(() => {
        if (cancelled) return;
        return el.animate(
          [
            { transform: "translate(0px, 0%) rotate(0deg)" },
            { transform: `translate(0px, 0%) rotate(${7 * swingDir}deg)`, offset: 0.18 },
            { transform: `translate(0px, 0%) rotate(${-5 * swingDir}deg)`, offset: 0.42 },
            { transform: `translate(0px, 0%) rotate(${3.2 * swingDir}deg)`, offset: 0.62 },
            { transform: `translate(0px, 0%) rotate(${-1.6 * swingDir}deg)`, offset: 0.8 },
            { transform: `translate(0px, 0%) rotate(${0.6 * swingDir}deg)`, offset: 0.93 },
            { transform: "translate(0px, 0%) rotate(0deg)" },
          ],
          { duration: SWING_MS, easing: "ease-in-out", fill: "forwards" },
        ).finished;
      })
      .then(() => {
        if (cancelled) return;
        done.current();
        el.animate(
          [
            { transform: "translate(0px, 0px) rotate(0deg)" },
            { transform: `translate(${dx * 0.25}px, ${land * 0.3}px) rotate(${rot * 0.5}deg)`, offset: 0.35 },
            { transform: `translate(${dx * 0.85}px, ${land * 0.86}px) rotate(${rot * 1.1}deg)`, offset: 0.75 },
            { transform: `translate(${dx}px, ${land + 5}px) rotate(${rot}deg)`, offset: 0.9 },
            { transform: `translate(${dx}px, ${land}px) rotate(${rot}deg)` },
          ],
          { duration: DROP_MS, easing: "cubic-bezier(0.5, 0, 0.75, 1)", fill: "forwards" },
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sheet]);
  return (
    <div
      ref={ref}
      className="absolute top-0 will-change-transform"
      style={{ left: PAGE_LEFT, width: PAGE_W, height: PAGE_H, transform: "translate(0px, -101%)", transformOrigin: "50% 0%" }}
    >
      <Page variant={sheet.variant} />
    </div>
  );
}

/**
 * Landing illustration: a printer that keeps printing. Each page feeds out of the slot while
 * the print head sweeps, swings from the slot like a pendulum, then drops with a little drift and
 * spin and settles on a growing stack.
 * After twelve pages the stack is cleared and it starts again. Pauses in background tabs;
 * shows a still frame for people who prefer reduced motion.
 */
export function PrinterHero() {
  const [sheets, setSheets] = React.useState<Sheet[]>([]);
  const [printed, setPrinted] = React.useState(0);
  const [phase, setPhase] = React.useState<"printing" | "done" | "clearing">("printing");
  const [still, setStill] = React.useState(false);
  const counter = React.useRef(0);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    const first = window.setTimeout(sync, 0);
    media.addEventListener("change", sync);
    return () => {
      window.clearTimeout(first);
      media.removeEventListener("change", sync);
    };
  }, []);

  React.useEffect(() => {
    if (still) return;
    let timer: number | undefined;
    let level = 0;
    const spawn = () => {
      if (document.visibilityState !== "visible") {
        timer = window.setTimeout(spawn, 600);
        return;
      }
      if (level >= CYCLE) {
        setPhase("done");
        timer = window.setTimeout(() => {
          setPhase("clearing");
          timer = window.setTimeout(() => {
            level = 0;
            setSheets([]);
            setPrinted(0);
            setPhase("printing");
            timer = window.setTimeout(spawn, 400);
          }, 700);
        }, 1400);
        return;
      }
      const id = ++counter.current;
      const rnd = ((id * 9301 + 49297) % 233280) / 233280;
      const sheet: Sheet = { id, variant: id, dx: Math.round((rnd - 0.5) * 30), rot: Math.round((rnd - 0.5) * 120) / 10, level };
      level += 1;
      setSheets((list) => [...list.slice(-7), sheet]);
      timer = window.setTimeout(spawn, EMERGE_MS + SWING_MS + DROP_MS + 150);
    };
    timer = window.setTimeout(spawn, 500);
    return () => window.clearTimeout(timer);
  }, [still]);

  const printing = phase === "printing" && !still;

  return (
    <div aria-hidden className="relative mx-auto h-[600px] w-[400px] select-none">
      {/* floor shadow */}
      <div className="absolute bottom-3 left-1/2 h-7 w-[320px] -translate-x-1/2 rounded-[50%] bg-[#0f1b2d]/12 blur-lg" />

      {/* paper waiting in the rear tray */}
      <div className="absolute left-1/2 top-[6px] h-[96px] w-[210px] -translate-x-1/2 [transform:perspective(500px)_rotateX(28deg)]">
        <div className="absolute inset-0 translate-y-2 rounded-t-[4px] border border-[#dde5f2] bg-[#f7f9fd]" />
        <div className="absolute inset-0 rounded-t-[4px] border border-[#dde5f2] bg-white" />
      </div>

      {/* printer body */}
      <div
        className={cn(
          "absolute left-1/2 top-[70px] h-[150px] w-[360px] -translate-x-1/2 rounded-[26px] border border-[#c5d1e4] bg-[linear-gradient(180deg,#ffffff_0%,#f1f5fd_100%)] shadow-[0_24px_48px_-20px_rgb(15_27_45/0.45),inset_0_1px_0_#ffffff]",
          printing && "printer-body",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-[52px] rounded-t-[26px] border-b border-[#dde5f2] bg-[#f5f8fe]" />
        <div className="absolute left-5 top-[13px] flex items-center gap-2">
          <QuireMark className="size-[26px]" />
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-[#0f1b2d]">Quire</span>
        </div>
        <div className="absolute right-5 top-[11px] flex items-center gap-2.5">
          <div className="flex h-[30px] w-[122px] items-center justify-center rounded-[7px] bg-[#0f1b2d] font-mono text-[11px] font-semibold tracking-[0.08em] text-[#8fb2ff] shadow-[inset_0_1px_3px_rgb(0_0_0/0.5)]">
            {still ? "READY" : phase === "printing" ? `PRINTING ${Math.min(printed + 1, CYCLE)}/${CYCLE}` : "DONE ✓"}
          </div>
          <span className={cn("size-2.5 rounded-full", phase === "printing" ? "printer-led bg-[#2f6bf0]" : "bg-[#16895a]")} />
        </div>
        <div className="absolute inset-x-7 top-[74px] flex items-center gap-1.5">
          <span className="h-[3px] flex-1 rounded-full bg-[#1d4ed8]/80" />
          <span className="size-1.5 rounded-full bg-[#c5d1e4]" />
          <span className="size-1.5 rounded-full bg-[#c5d1e4]" />
        </div>
        {/* output slot with the print head light */}
        <div className="absolute bottom-[14px] left-1/2 h-[12px] w-[262px] -translate-x-1/2 overflow-hidden rounded-full bg-[#0f1b2d] shadow-[inset_0_2px_3px_rgb(0_0_0/0.6)]">
          {printing ? <span className="printer-head absolute top-1/2 h-[3px] w-10 -translate-y-1/2 rounded-full bg-[#8fb2ff] shadow-[0_0_10px_#8fb2ff]" /> : null}
        </div>
      </div>

      {/* output tray lip */}
      <div className="absolute left-1/2 top-[212px] h-[16px] w-[300px] -translate-x-1/2 bg-[#e3eaf6] [clip-path:polygon(5%_0,95%_0,100%_100%,0_100%)]" />

      {/* pages: clipped at the slot, so they come out of the printer */}
      <div
        className={cn("absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden transition-opacity duration-700", phase === "clearing" && "opacity-0")}
        style={{ top: 202, width: OUT_W, height: OUT_H }}
      >
        {still ? (
          <>
            <div className="absolute" style={{ left: PAGE_LEFT, top: OUT_H - PAGE_H - 4, width: PAGE_W, height: PAGE_H, transform: "rotate(-3deg)" }}>
              <Page variant={1} />
            </div>
            <div className="absolute" style={{ left: PAGE_LEFT, top: 0, width: PAGE_W, height: PAGE_H, transform: "translateY(-45%)" }}>
              <Page variant={0} />
            </div>
          </>
        ) : (
          sheets.map((s) => <FallingSheet key={s.id} sheet={s} onPrinted={() => setPrinted((n) => n + 1)} />)
        )}
      </div>
    </div>
  );
}
