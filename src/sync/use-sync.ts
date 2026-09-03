import { useEffect, useState } from "preact/hooks";
import { getState, subscribe, type SyncState } from "~/sync/engine";

export function useSyncState(): SyncState {
  const [s, setS] = useState<SyncState>(getState());
  useEffect(() => subscribe(setS), []);
  return s;
}
