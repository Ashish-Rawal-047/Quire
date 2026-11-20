"use client";

import * as React from "react";

/**
 * A number that counts up to its value (and eases to new values when it changes). Screen readers
 * get the final value only. Jumps straight there under reduced motion.
 */
export function CountUp({ value, format = String, duration = 900 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = React.useState(0);
  const from = React.useRef(0);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
