import { useEffect, useState } from "preact/hooks";
import { useLive } from "~/lib/live";
import { nextDay } from "~/lib/rotation";
import { db } from "~/db/schema";
import { seedIfNeeded } from "~/db/seed";
import { DAY_TITLES, DAY_NOTES } from "~/data/program-v1";
import { getToken } from "~/sync/client";
import { runSync, startAutoSync } from "~/sync/engine";
import { useSyncState } from "~/sync/use-sync";
import { Home } from "~/screens/home";
import { Today } from "~/screens/today";
import { Unlock } from "~/screens/unlock";

type View = "home" | "today";

const initialView: View =
  new URLSearchParams(location.search).get("screen") === "today" ? "today" : "home";

export function App() {
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));
  if (!hasToken) return <Unlock onDone={() => setHasToken(true)} />;
  return <Shell />;
}

function Shell() {
  const [view, setView] = useState<View>(initialView);
  const [ready, setReady] = useState(false);
  const sync = useSyncState();

  useEffect(() => {
    let stop = () => {};
    (async () => {
      // сначала тянем с сервера (второе устройство получит настоящую программу),
      // потом сидим локально, только если так и пусто
      await runSync().catch(() => {});
      await seedIfNeeded();
      setReady(true);
      stop = startAutoSync();
    })();
    return () => stop();
  }, []);

  const day = useLive(() => nextDay(), []);
  const slots = useLive(
    async () =>
      day
        ? db.programSlots.where({ versionId: "v1", day }).filter((s) => !s.deleted).sortBy("ord")
        : [],
    [day],
  );
  const exercises = useLive(() => db.exercises.filter((e) => !e.deleted).toArray(), []);

  if (!ready || !day || !slots || !exercises) {
    return <div class="boot">загрузка…</div>;
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  if (view === "today") {
    return (
      <Today
        day={day}
        title={DAY_TITLES[day]}
        note={DAY_NOTES[day]}
        slots={slots}
        exerciseById={byId}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <Home
      day={day}
      dayTitle={DAY_TITLES[day]}
      exerciseCount={slots.length}
      sync={sync}
      onOpenToday={() => setView("today")}
    />
  );
}
