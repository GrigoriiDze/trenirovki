import { useEffect, useState } from "preact/hooks";
import { useLive } from "~/lib/live";
import { nextDay } from "~/lib/rotation";
import { db, type DayCode } from "~/db/schema";
import { seedIfNeeded } from "~/db/seed";
import { DAY_TITLES, DAY_NOTES } from "~/data/program-v1";
import { getToken } from "~/sync/client";
import { runSync, startAutoSync } from "~/sync/engine";
import { useSyncState } from "~/sync/use-sync";
import { openSession, startSession } from "~/session/store";
import { Home } from "~/screens/home";
import { Today } from "~/screens/today";
import { Session } from "~/screens/session";
import { Summary } from "~/screens/summary";
import { Unlock } from "~/screens/unlock";

type Route =
  | { name: "home" }
  | { name: "today" }
  | { name: "session" }
  | { name: "summary"; sessionId: string };

export function App() {
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));
  if (!hasToken) return <Unlock onDone={() => setHasToken(true)} />;
  return <Shell />;
}

const initialRoute: Route =
  new URLSearchParams(location.search).get("screen") === "today"
    ? { name: "today" }
    : { name: "home" };

function Shell() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [ready, setReady] = useState(false);
  const sync = useSyncState();

  useEffect(() => {
    let stop = () => {};
    (async () => {
      await runSync().catch(() => {});
      await seedIfNeeded();
      setReady(true);
      stop = startAutoSync();
    })();
    return () => stop();
  }, []);

  const suggested = useLive(() => nextDay(), []);
  const exercises = useLive(() => db.exercises.filter((e) => !e.deleted).toArray(), []);
  const open = useLive(() => openSession(), []);

  // какой день показывает «Сегодня»: по умолчанию подсказанный, можно сменить вручную
  const [pickedDay, setPickedDay] = useState<DayCode | null>(null);
  const day = pickedDay ?? suggested ?? null;

  const todaySlots = useLive(
    async () => (day ? slotsFor("v1", day) : []),
    [day],
  );
  // слоты активной сессии (её день/версия зафиксированы)
  const sessSlots = useLive(
    async () => (open ? slotsFor(open.versionId, open.day) : []),
    [open?.id],
  );

  if (!ready || !day || !suggested || !exercises || !todaySlots) {
    return <div class="boot">загрузка…</div>;
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  if (route.name === "session" && open && sessSlots?.length) {
    return (
      <Session
        session={open}
        slots={sessSlots}
        exerciseById={byId}
        onExit={() => setRoute({ name: "home" })}
        onFinish={() => setRoute({ name: "summary", sessionId: open.id })}
      />
    );
  }

  if (route.name === "summary") {
    return <SummaryLoader sessionId={route.sessionId} byId={byId} onHome={() => setRoute({ name: "home" })} />;
  }

  if (route.name === "today") {
    return (
      <Today
        day={day}
        suggested={suggested}
        title={DAY_TITLES[day]}
        note={DAY_NOTES[day]}
        slots={todaySlots}
        exerciseById={byId}
        onPickDay={setPickedDay}
        onBack={() => setRoute({ name: "home" })}
        onStart={async () => {
          if (!open) await startSession(day, "v1");
          setRoute({ name: "session" });
        }}
      />
    );
  }

  return (
    <Home
      day={suggested}
      dayTitle={DAY_TITLES[suggested]}
      exerciseCount={todaySlots.length}
      sync={sync}
      hasOpenSession={Boolean(open)}
      onOpenToday={() => setRoute({ name: "today" })}
      onResume={() => setRoute({ name: "session" })}
    />
  );
}

function slotsFor(versionId: string, day: string) {
  return db.programSlots
    .where({ versionId, day })
    .filter((s) => !s.deleted)
    .sortBy("ord");
}

function SummaryLoader({
  sessionId,
  byId,
  onHome,
}: {
  sessionId: string;
  byId: Map<string, import("~/db/schema").Exercise>;
  onHome: () => void;
}) {
  const s = useLive(() => db.sessions.get(sessionId), [sessionId]);
  if (!s) return <div class="boot">…</div>;
  return <Summary session={s} exerciseById={byId} onHome={onHome} />;
}
