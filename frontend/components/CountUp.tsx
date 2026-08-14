"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  to: number;
  duration?: number;
  className?: string;
  decimals?: number;
}

export default function CountUp({ to, duration = 1.2, className = "", decimals = 0 }: Props) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // ease-out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = from + (to - from) * eased;
      setVal(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {decimals > 0 ? val.toFixed(decimals) : Math.round(val)}
    </span>
  );
}
