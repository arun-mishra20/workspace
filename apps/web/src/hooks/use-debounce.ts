import { useEffect, useState } from "react";

/**
 * Debounces a value by the given delay (ms).
 *
 * @example
 * const debouncedSearch = useDebounce(searchInput, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
