import { useState, useEffect } from 'react';

/**
 * Devuelve un valor que se actualiza con delay (debounce) tras cambios en el valor original.
 * Evita ejecutar lógica costosa en cada keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debouncedValue;
}
