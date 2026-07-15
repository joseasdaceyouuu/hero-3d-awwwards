"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useInView — simple replacement for react-intersection-observer.
 * Returns [ref, inView].
 */
export function useInView(options?: { threshold?: number }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: options?.threshold ?? 0 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options?.threshold]);

  return [ref, inView] as const;
}
