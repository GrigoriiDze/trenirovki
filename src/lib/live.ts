import { liveQuery } from "dexie";
import { useEffect, useState } from "preact/hooks";

/** Мини-обёртка над Dexie.liveQuery для Preact.
 *  Перечитывает при любом изменении затронутых таблиц. */
export function useLive<T>(query: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (e) => console.error("liveQuery", e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
