import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options?: IntersectionObserverInit): {
  ref: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // fire once, then stop
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}
