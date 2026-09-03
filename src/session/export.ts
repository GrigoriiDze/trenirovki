/* Холодный бэкап: весь Dexie → JSON-файл. На случай, если что-то
   разойдётся с синком. */

import { db, SYNC_TABLES } from "~/db/schema";

export async function downloadBackup(): Promise<void> {
  const data: Record<string, unknown[]> = {};
  for (const t of SYNC_TABLES) data[t] = await db.table(t).toArray();

  const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), data }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trenirovki-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
