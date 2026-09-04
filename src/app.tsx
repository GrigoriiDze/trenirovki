import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { useLive } from "~/lib/live";
import { nextDay } from "~/lib/rotation";
import { db, type DayCode, type Exercise } from "~/db/schema";
import { seedBody, seedIfNeeded, syncCatalog } from "~/db/seed";
import { DAY_TITLES, DAY_NOTES } from "~/data/program-v1";
import { getToken } from "~/sync/client";
import { runSync, startAutoSync } from "~/sync/engine";
import { useSyncState } from "~/sync/use-sync";
import { openSession, sessionExercises, startSession } from "~/session/store";
import { Home } from "~/screens/home";
import { Today } from "~/screens/today";
import { Session } from "~/screens/session";
import { Summary } from "~/screens/summary";
import { Diary } from "~/screens/diary";
import { ExerciseScreen } from "~/screens/exercise";
import { Progress } from "~/screens/progress";
import { Body } from "~/screens/body";
import { Library } from "~/screens/library";
import { Unlock } from "~/screens/unlock";

type Route =
  | { name: "home" }
  | { name: "today" }
  | { name: "session" }
  | { name: "summary"; sessionId: string }
  | { name: "diary" }
  | { name: "progress" }
  | { name: "body" }
  | { name: "library" }
  | { name: "exercise"; exerciseId: string; back: Route };

/** Обёртка экрана: безопасные зоны (вырез/статус-бар) + анимация появления.
 *  key меняется при смене экрана → Preact перемонтирует → проигрывается вход. */
function Screen({ k, children }: { k: string; children: ComponentChildren }) {
  return (
    <div class="screen" key={k}>
      {children}
    </div>
  );
}

export function App() {
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));
  if (!hasToken) {
    return (
      <Screen k="unlock">
        <Unlock onDone={() => setHasToken(true)} />
      </Screen>
    );
  }
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
      await syncCatalog();
      await seedBody();
      setReady(true);
      stop = startAutoSync();
    })();
    return () => stop();
  }, []);

  const suggested = useLive(() => nextDay(), []);
  const exercises = useLive(() => db.exercises.filter((e) => !e.deleted).toArray(), []);
  const open = useLive(() => openSession(), []);

  const [pickedDay, setPickedDay] = useState<DayCode | null>(null);
  const day = pickedDay ?? suggested ?? null;

  const todaySlots = useLive(async () => (day ? slotsFor("v1", day) : []), [day]);
  const sessItems = useLive(async () => (open ? sessionExercises(open.id) : []), [open?.id]);

  if (!ready || !day || !suggested || !exercises || !todaySlots) {
    return <div class="boot">загрузка…</div>;
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  let screen: ComponentChildren;
  let key: string = route.name;

  const openExercise = (exerciseId: string) =>
    setRoute({ name: "exercise", exerciseId, back: route });

  if (route.name === "exercise") {
    key = `exercise-${route.exerciseId}`;
    const back = route.back;
    screen = (
      <ExerciseScreen
        exerciseId={route.exerciseId}
        exercise={byId.get(route.exerciseId)}
        onBack={() => setRoute(back)}
      />
    );
  } else if (route.name === "progress") {
    screen = (
      <Progress
        exerciseById={byId}
        onBack={() => setRoute({ name: "home" })}
        onOpenExercise={openExercise}
      />
    );
  } else if (route.name === "body") {
    screen = <Body onBack={() => setRoute({ name: "home" })} />;
  } else if (route.name === "library") {
    screen = (
      <Library
        exercises={exercises}
        onBack={() => setRoute({ name: "home" })}
        onOpenExercise={openExercise}
      />
    );
  } else if (route.name === "session" && open && sessItems) {
    screen = (
      <Session
        session={open}
        items={sessItems}
        exerciseById={byId}
        allExercises={exercises}
        onExit={() => setRoute({ name: "home" })}
        onFinish={() => setRoute({ name: "summary", sessionId: open.id })}
        onOpenExercise={openExercise}
      />
    );
  } else if (route.name === "summary") {
    key = `summary-${route.sessionId}`;
    screen = (
      <SummaryLoader
        sessionId={route.sessionId}
        byId={byId}
        onHome={() => setRoute({ name: "home" })}
        onOpenExercise={openExercise}
      />
    );
  } else if (route.name === "diary") {
    screen = (
      <Diary
        exerciseById={byId}
        onBack={() => setRoute({ name: "home" })}
        onOpenExercise={openExercise}
      />
    );
  } else if (route.name === "today") {
    screen = (
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
  } else {
    screen = (
      <Home
        day={suggested}
        dayTitle={DAY_TITLES[suggested]}
        exerciseCount={todaySlots.length}
        exerciseById={byId}
        sync={sync}
        hasOpenSession={Boolean(open)}
        onOpenToday={() => setRoute({ name: "today" })}
        onResume={() => setRoute({ name: "session" })}
        onOpenDiary={() => setRoute({ name: "diary" })}
        onOpenProgress={() => setRoute({ name: "progress" })}
        onOpenBody={() => setRoute({ name: "body" })}
        onOpenLibrary={() => setRoute({ name: "library" })}
      />
    );
  }

  return <Screen k={key}>{screen}</Screen>;
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
  onOpenExercise,
}: {
  sessionId: string;
  byId: Map<string, Exercise>;
  onHome: () => void;
  onOpenExercise: (id: string) => void;
}) {
  const s = useLive(() => db.sessions.get(sessionId), [sessionId]);
  if (!s) return <div class="boot">…</div>;
  return (
    <Summary session={s} exerciseById={byId} onHome={onHome} onOpenExercise={onOpenExercise} />
  );
}
