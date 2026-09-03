import { useState } from "preact/hooks";
import { useLive } from "~/lib/live";
import { nextDay } from "~/lib/rotation";
import { db } from "~/db/schema";
import { DAY_TITLES, DAY_NOTES } from "~/data/program-v1";
import { Home } from "~/screens/home";
import { Today } from "~/screens/today";

type View = "home" | "today";

const initialView: View =
  new URLSearchParams(location.search).get("screen") === "today" ? "today" : "home";

export function App() {
  const [view, setView] = useState<View>(initialView);

  const day = useLive(() => nextDay(), []);
  const slots = useLive(
    async () => (day ? db.programSlots.where({ versionId: "v1", day }).sortBy("order") : []),
    [day],
  );
  const exercises = useLive(() => db.exercises.toArray(), []);

  if (!day || !slots || !exercises) {
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
      onOpenToday={() => setView("today")}
    />
  );
}
