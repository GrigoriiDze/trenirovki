import { useLive } from "~/lib/live";
import { nextDay } from "~/lib/rotation";
import { db } from "~/db/schema";
import { DAY_TITLES, DAY_NOTES } from "~/data/program-v1";
import { TodayPreview } from "~/screens/today-preview";

export function App() {
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

  return (
    <TodayPreview
      day={day}
      title={DAY_TITLES[day]}
      note={DAY_NOTES[day]}
      slots={slots}
      exerciseById={byId}
    />
  );
}
