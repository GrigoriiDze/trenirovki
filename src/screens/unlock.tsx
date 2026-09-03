import { useState } from "preact/hooks";
import { clearToken, setToken } from "~/sync/client";
import { getState, runSync } from "~/sync/engine";
import "./unlock.css";

export function Unlock({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setToken(code);
    await runSync();
    const s = getState().status;
    if (s === "bad-token") {
      clearToken();
      setErr("Неверный код");
      setBusy(false);
      return;
    }
    onDone(); // ok или offline — код принят, синк догонит
  }

  return (
    <main class="unlock">
      <form class="unlock__box" onSubmit={submit}>
        <h1>Тренировки</h1>
        <p class="unlock__hint">Введи код доступа. Один раз — дальше запомнится.</p>
        <input
          class="unlock__input num"
          type="password"
          inputMode="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          value={code}
          onInput={(e) => setCode((e.target as HTMLInputElement).value)}
          placeholder="код"
          aria-label="код доступа"
        />
        {err ? <p class="unlock__err">{err}</p> : null}
        <button class="btn btn--primary" type="submit" disabled={busy || !code.trim()}>
          {busy ? "Проверяю…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
