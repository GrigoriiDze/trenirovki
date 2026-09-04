import { useMemo, useState } from "preact/hooks";
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from "~/db/schema";
import "./library.css";

export function Library({
  exercises,
  onBack,
  onOpenExercise,
}: {
  exercises: Exercise[];
  onBack: () => void;
  onOpenExercise: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const usedMuscles = useMemo(
    () => MUSCLE_GROUPS.filter((m) => exercises.some((e) => e.muscle === m)),
    [exercises],
  );

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return exercises
      .filter((e) => !muscle || e.muscle === muscle)
      .filter((e) => !query || e.nameRu.toLowerCase().includes(query) || e.nameEn.toLowerCase().includes(query))
      .sort((a, b) => a.nameRu.localeCompare(b.nameRu, "ru"));
  }, [exercises, q, muscle]);

  return (
    <main class="lib">
      <header class="lib__head">
        <button class="lib__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1>Библиотека</h1>
        <span class="lib__count num">{exercises.length}</span>
      </header>

      <input
        class="lib__search"
        type="search"
        inputMode="search"
        placeholder="Найти упражнение…"
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
      />

      <div class="lib__chips">
        <button class={muscle === null ? "on" : ""} onClick={() => setMuscle(null)}>
          все
        </button>
        {usedMuscles.map((m) => (
          <button key={m} class={muscle === m ? "on" : ""} onClick={() => setMuscle(m === muscle ? null : m)}>
            {m}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p class="lib__empty">Ничего не нашлось.</p>
      ) : (
        <ol class="lib__list">
          {list.map((e) => (
            <li key={e.id}>
              <button class="lib__row" onClick={() => onOpenExercise(e.id)}>
                {e.gifUrl ? (
                  <img class="lib__thumb" src={e.gifUrl} alt="" loading="lazy" />
                ) : (
                  <span class="lib__thumb lib__thumb--empty" aria-hidden="true" />
                )}
                <span class="lib__info">
                  <span class="lib__name">{e.nameRu}</span>
                  <span class="lib__muscle">
                    {e.muscle} · {e.equipment}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <p class="lib__credit">
        Иллюстрации техники — <a href="https://wger.de" target="_blank" rel="noreferrer">wger.de</a>,
        CC BY-SA 4.0 / CC0
      </p>
    </main>
  );
}
