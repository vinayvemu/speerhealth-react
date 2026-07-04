import { useRef, useCallback } from 'react';

export function useThrottle<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): (...args: T) => void {
  const lastRan = useRef(0);

  return useCallback(
    (...args: T) => {
      const now = Date.now();
      if (now - lastRan.current >= delay) {
        lastRan.current = now;
        fn(...args);
      }
    },
    [fn, delay],
  );
}
