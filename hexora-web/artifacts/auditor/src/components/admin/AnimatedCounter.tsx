import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

export interface AnimatedCounterProps {
  value: number;
  /** decimal places */
  decimals?: number;
  /** ms */
  duration?: number;
  /** optional formatter for short-units (k, M, etc.) */
  format?: (n: number) => string;
  className?: string;
}

const defaultFormat = (n: number, decimals: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 900,
  format,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      prev.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(prev.current, value, {
      duration: duration / 1000,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        prev.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  const text = format
    ? format(display)
    : defaultFormat(display, decimals);

  return <span className={className}>{text}</span>;
}

export default AnimatedCounter;