/* Код доступа к API. Вводится один раз на экране входа, лежит в localStorage,
   уходит в заголовке Authorization. В бандле его нет. */

const KEY = "trenirovki:token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token.trim());
  } catch {
    /* приватный режим — просто не сохранится */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export class Unauthorized extends Error {}
export class Offline extends Error {}

export interface SyncBody {
  since: number;
  push: Record<string, Record<string, unknown>[]>;
}
export interface SyncResponse {
  now: number;
  pull: Record<string, Record<string, unknown>[]>;
}

export async function postSync(body: SyncBody): Promise<SyncResponse> {
  const token = getToken();
  if (!token) throw new Unauthorized("нет кода доступа");

  let res: Response;
  try {
    res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Offline("нет сети");
  }

  if (res.status === 401) throw new Unauthorized("неверный код");
  if (!res.ok) throw new Error(`sync ${res.status}`);
  return (await res.json()) as SyncResponse;
}
