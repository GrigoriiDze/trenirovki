/* Импорт исторического дневника Григория (context/07) → session + setLog.
   План 03, этап C.

   Без флагов — dry-run: парсит, пишет разбор в scripts/_history-parsed.json,
   печатает сводку и предупреждения. Ничего в БД не трогает.

   `--write` — читает тот же _history-parsed.json (можно поправить руками
   после dry-run) и заливает в Neon. Идемпотентно: id детерминированы
   (imp-<ГГГГММДД>...), повторный прогон перезаписывает.

   Запуск: npx tsx --env-file=.env scripts/import-history.ts [--write]
*/

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXERCISES } from "../src/data/program-v1.ts";
import { EXERCISES_EXTRA } from "../src/data/exercises-extra.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SRC = `${HERE}../context/07-istoriya-grigoriya.md`;
const OUT = `${HERE}_history-parsed.json`;
const WRITE = process.argv.includes("--write");

const CATALOG = [...EXERCISES, ...EXERCISES_EXTRA];
const KNOWN_SLUGS = new Set(CATALOG.map((e) => e.id));

/* ── название в дневнике → слаг (длинные/специфичные вперёд) ── */
const NAME_MAP: [string, string][] = [
  ["pec deck rear deltoid", "reverse-pec-deck"],
  ["pec fly rear deltoit", "reverse-pec-deck"],
  ["pec deck rear", "reverse-pec-deck"],
  ["обратные разведения", "reverse-pec-deck"],
  ["pec deck", "pec-deck"],
  ["pec fly", "pec-deck"],
  ["chest-supported row", "chest-supported-row"],
  ["chest supported row", "chest-supported-row"],
  ["seated dumbbell shoulder press", "shoulder-press"],
  ["machine shoulder press", "shoulder-press"],
  ["seated leg press", "leg-press"],
  ["lying/seated leg curls", "lying-leg-curl"],
  ["lying/seated leg curl", "lying-leg-curl"],
  ["lying leg curl", "lying-leg-curl"],
  ["seated leg curl", "seated-leg-curl"],
  ["leg curl", "lying-leg-curl"],
  ["leg extension", "leg-extension"],
  ["lat pulldown", "lat-pulldown"],
  ["lat pull", "lat-pulldown"],
  ["pull down", "lat-pulldown"],
  ["pull d", "lat-pulldown"],
  ["low pull", "seated-cable-row"],
  ["hip adduction (разведение)", "hip-abduction"],
  ["hip adduction (сведение)", "hip-adduction"],
  ["hip abduction", "hip-abduction"],
  ["hip adduction", "hip-adduction"],
  ["hip addiction", "hip-adduction"],
  ["glute", "hip-abduction"],
  ["трапеция", "shrug"],
  ["incline dumbbell press", "incline-db-press"],
  ["cable lateral raises", "lateral-raise-machine"],
  ["cable lateral raise", "lateral-raise-machine"],
  ["triceps rope pushdown", "triceps-pushdown"],
  ["dumbbell hammer curls", "hammer-curl"],
  ["dumbbell hammer", "hammer-curl"],
  ["hammer curl", "hammer-curl"],
  ["biceps", "db-curl-seated"], // Григорий: сгибания гантелей сидя с доворотом
  ["face pulls", "face-pull"],
  ["face pull", "face-pull"],
  ["upper push chest", "machine-chest-press"],
  ["chest press", "machine-chest-press"],
  ["жим лежа", "barbell-bench"],
  ["barbell bench press", "barbell-bench"],
  ["barbell bench", "barbell-bench"],
  ["скручивания", "cable-crunch"],
  ["t-bar", "t-bar-row"],
];

interface ParsedSet {
  weight: number;
  reps: number;
}
interface ParsedExercise {
  raw: string;
  srcName: string; // что сматчилось из NAME_MAP
  slug: string | null;
  sets: ParsedSet[];
  warn: string | null;
}
interface ParsedSession {
  date: string; // ГГГГ-ММ-ДД
  epoch: number;
  note: string[];
  exercises: ParsedExercise[];
}

const warnings: string[] = [];

function extractFenced(md: string): string {
  const m = md.match(/```([\s\S]*?)```/);
  if (!m) throw new Error("не нашёл ``` блок в context/07");
  return m[1]!;
}

function toEpoch(dd: number, mm: number): number {
  return new Date(2026, mm - 1, dd, 12, 0, 0).getTime();
}

/** Разбор набора подходов из хвоста строки после названия. */
function parseSets(spec: string): { sets: ParsedSet[]; warn: string | null } {
  let s = spec
    .replace(/\([^)]*\)/g, " ") // «(Обратные разведения…)» — мусор в хвосте
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,\s*$/, "")
    .replace(/кг/gi, "kg") // кириллица
    .replace(/(\d+)\s*[–—-]\s*(\d+)\s*kg/gi, "$1 kg"); // диапазон «50-55kg» → первый
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return { sets: [], warn: "нет данных о подходах" };
  if (!/\d/.test(s)) return { sets: [], warn: null }; // упражнение без чисел — молча без подходов

  const num = "(\\d+(?:[.,]\\d+)?)";
  const n = (x: string) => parseFloat(x.replace(",", "."));

  // 1) «вес kg reps*N» — только если это ВСЯ строка (иначе первые подходы теряются)
  let m = s.match(new RegExp(`^${num}\\s*kg[\\s,]+${num}\\s*[*x]\\s*(\\d+)$`, "i"));
  if (m) {
    const [w, r, cnt] = [n(m[1]!), n(m[2]!), parseInt(m[3]!, 10)];
    return { sets: Array.from({ length: cnt }, () => ({ weight: w, reps: r })), warn: null };
  }
  // 1b) «вес kg *N» (повторы неизвестны) — вся строка
  m = s.match(new RegExp(`^${num}\\s*kg\\s*[*x]\\s*(\\d+)$`, "i"));
  if (m) {
    const [w, cnt] = [n(m[1]!), parseInt(m[2]!, 10)];
    return {
      sets: Array.from({ length: cnt }, () => ({ weight: w, reps: 0 })),
      warn: "повторы не указаны (*N)",
    };
  }
  // 2) «вес kg, N подходов, в среднем R»
  m = s.match(new RegExp(`^${num}\\s*kg[\\s,]+(\\d+)\\s*подход[а-я]*[\\s,]+в среднем\\s+(\\d+)`, "i"));
  if (m) {
    const [w, cnt, r] = [n(m[1]!), parseInt(m[2]!, 10), n(m[3]!)];
    return { sets: Array.from({ length: cnt }, () => ({ weight: w, reps: r })), warn: null };
  }
  // 3) «R раз: вес kg, вес kg, ...»
  m = s.match(/^(\d+)\s*раз:?\s*(.+)/i);
  if (m) {
    const r = parseInt(m[1]!, 10);
    const sets = [...m[2]!.matchAll(new RegExp(`${num}\\s*kg`, "gi"))].map((x) => ({
      weight: n(x[1]!),
      reps: r,
    }));
    return sets.length ? { sets, warn: null } : { sets: [], warn: `не разобрал: "${spec}"` };
  }

  // 4) общий проход по токенам, вес «переносится»
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  const sets: ParsedSet[] = [];
  let curW: number | null = null;
  let curR: number | null = null;
  let warn: string | null = null;

  for (const part of parts) {
    // «вес kg reps*N» внутри строки («90 kg 12*3» после «80 kg 12,»)
    let mm = part.match(new RegExp(`^${num}\\s*kg\\s+${num}\\s*[*x]\\s*(\\d+)$`, "i"));
    if (mm) {
      curW = n(mm[1]!);
      curR = n(mm[2]!);
      const cnt = parseInt(mm[3]!, 10);
      for (let k = 0; k < cnt; k++) sets.push({ weight: curW, reps: curR });
      continue;
    }
    // «reps вес kg»  (Pec Deck: «12 45 kg»)
    mm = part.match(new RegExp(`^${num}\\s+${num}\\s*kg$`, "i"));
    if (mm) {
      curR = n(mm[1]!);
      curW = n(mm[2]!);
      sets.push({ weight: curW, reps: curR });
      continue;
    }
    // «вес kg reps»
    mm = part.match(new RegExp(`^${num}\\s*kg\\s+${num}$`, "i"));
    if (mm) {
      curW = n(mm[1]!);
      curR = n(mm[2]!);
      sets.push({ weight: curW, reps: curR });
      continue;
    }
    // «вес reps» без «kg» (Face pull: «65 13» после явных «50kg 12»)
    mm = part.match(new RegExp(`^${num}\\s+${num}$`));
    if (mm) {
      curW = n(mm[1]!);
      curR = n(mm[2]!);
      sets.push({ weight: curW, reps: curR });
      continue;
    }
    // «вес kg» (без повторов — перенос повторов, если были)
    mm = part.match(new RegExp(`^${num}\\s*kg$`, "i"));
    if (mm) {
      curW = n(mm[1]!);
      if (curR != null) {
        sets.push({ weight: curW, reps: curR });
        warn = "хвостовой вес без повторов — перенёс прошлые";
      }
      // иначе ждём повторы в следующем фрагменте
      continue;
    }
    // «reps» (перенос веса)
    mm = part.match(new RegExp(`^${num}$`));
    if (mm) {
      curR = n(mm[1]!);
      if (curW != null) sets.push({ weight: curW, reps: curR });
      else warn = "повторы без веса";
      continue;
    }
    warn = `не разобрал фрагмент: "${part}"`;
  }

  if (!sets.length) return { sets: [], warn: warn ?? `не разобрал: "${spec}"` };
  return { sets, warn };
}

function matchName(line: string): { slug: string | null; rest: string; name: string } {
  const low = line.toLowerCase();
  for (const [pat, slug] of NAME_MAP) {
    const i = low.indexOf(pat);
    if (i === 0 || (i > 0 && i <= 2)) {
      const rest = line.slice(low.indexOf(pat) + pat.length);
      return { slug, rest, name: pat };
    }
  }
  return { slug: null, rest: line, name: "" };
}

/** median по массиву чисел */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const CARDIO_RE = /(^бег|^велик|^велосипед|горка|сопротивлен)/i;

function parse(): ParsedSession[] {
  const text = extractFenced(readFileSync(SRC, "utf8"));
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out: ParsedSession[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const dm = lines[0]!.match(/^(\d{1,2})\.(\d{1,2})(?:\.\d{2})?/);
    if (!dm) continue;
    let dd = parseInt(dm[1]!, 10);
    let mm = parseInt(dm[2]!, 10);
    if (dm[1] === "29" && dm[2] === "09") {
      warnings.push(`29.09 — вероятно опечатка (дневник прислан 03.09). Ставлю 29.08.`);
      mm = 8;
    }
    const date = `2026-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

    const sess: ParsedSession = { date, epoch: toEpoch(dd, mm), note: [], exercises: [] };
    // остаток первой строки после даты может быть заметкой («, спустя месяц»)
    const tail0 = lines[0]!.replace(/^(\d{1,2})\.(\d{1,2})(?:\.\d{2})?/, "").replace(/^[,\s]+/, "");
    if (tail0) sess.note.push(tail0);

    for (const line of lines.slice(1)) {
      if (CARDIO_RE.test(line)) {
        sess.note.push(line);
        continue;
      }
      const { slug, rest, name } = matchName(line);
      if (!slug) {
        if (!/\d/.test(line)) sess.note.push(line);
        else {
          sess.exercises.push({ raw: line, srcName: "", slug: null, sets: [], warn: "не опознал упражнение" });
          warnings.push(`${date}: не опознал "${line}"`);
        }
        continue;
      }
      if (!KNOWN_SLUGS.has(slug)) warnings.push(`${date}: слаг ${slug} нет в каталоге`);
      const { sets, warn } = parseSets(rest);
      if (warn) warnings.push(`${date} · ${slug}: ${warn}  ← "${line}"`);
      sess.exercises.push({ raw: line, srcName: name, slug, sets, warn });
    }

    // «Glute» = то из отведения/сведения, что НЕ названо явно в этот день
    // (Григорий: делает и то, и другое). 03.05: Glute + Hip abduction → Glute = сведение.
    const named = new Set(sess.exercises.filter((e) => e.srcName !== "glute").map((e) => e.slug));
    for (const ex of sess.exercises) {
      if (ex.srcName !== "glute") continue;
      if (named.has("hip-abduction") && !named.has("hip-adduction")) {
        ex.slug = "hip-adduction";
        warnings.push(`${date}: «Glute» → hip-adduction (в этот день явно назван hip-abduction)`);
      } else if (named.has("hip-adduction") && !named.has("hip-abduction")) {
        ex.slug = "hip-abduction";
        warnings.push(`${date}: «Glute» → hip-abduction (в этот день явно назван hip-adduction)`);
      } else {
        warnings.push(`${date}: «Glute» оставлен как ${ex.slug} — уточнить`);
      }
    }

    const dup = new Map<string, number>();
    for (const ex of sess.exercises) {
      if (!ex.slug) continue;
      dup.set(ex.slug, (dup.get(ex.slug) ?? 0) + 1);
    }
    for (const [slug, cnt] of dup) {
      if (cnt > 1) warnings.push(`${date}: ${slug} встречается ${cnt}× — подходы склеятся`);
    }

    out.push(sess);
  }

  backfillEmpty(out);
  return out;
}

/** Строки с названием без чисел → медиана веса/повторов/числа подходов
 *  по остальным вхождениям этого упражнения в истории (просьба Григория). */
function backfillEmpty(sessions: ParsedSession[]): void {
  const stat = new Map<string, { w: number[]; r: number[]; c: number[] }>();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (!ex.slug || !ex.sets.length) continue;
      const st = stat.get(ex.slug) ?? { w: [], r: [], c: [] };
      for (const set of ex.sets) {
        if (set.weight > 0) st.w.push(set.weight);
        if (set.reps > 0) st.r.push(set.reps);
      }
      st.c.push(ex.sets.length);
      stat.set(ex.slug, st);
    }
  }
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (!ex.slug) continue;
      const st = stat.get(ex.slug);

      // строка без подходов — целиком из медианы
      if (!ex.sets.length) {
        if (!st || !st.r.length) {
          warnings.push(`${s.date} · ${ex.slug}: нет истории для среднего — строка выпадет`);
          continue;
        }
        const w = st.w.length ? Math.round(median(st.w) * 2) / 2 : 0;
        const r = Math.round(median(st.r));
        const c = Math.max(1, Math.round(median(st.c)));
        ex.sets = Array.from({ length: c }, () => ({ weight: w, reps: r }));
        ex.warn = "средние по истории";
        warnings.push(`${s.date} · ${ex.slug}: подставил среднее ${w > 0 ? `${w}кг × ` : ""}${r} × ${c}`);
        continue;
      }

      // подходы есть, но повторы не записаны (`12.5 kg *4`) — повторы из медианы
      if (st && st.r.length && ex.sets.some((x) => x.reps === 0)) {
        const r = Math.round(median(st.r));
        ex.sets.forEach((x) => {
          if (x.reps === 0) x.reps = r;
        });
        warnings.push(`${s.date} · ${ex.slug}: повторы не записаны → медиана ${r}`);
      }
    }
  }
}

/* ── main ── */

if (!WRITE) {
  const sessions = parse();
  writeFileSync(OUT, JSON.stringify(sessions, null, 2));

  const nSess = sessions.length;
  const nSets = sessions.reduce(
    (s, x) => s + x.exercises.reduce((a, e) => a + e.sets.length, 0),
    0,
  );
  const nEx = sessions.reduce((s, x) => s + x.exercises.filter((e) => e.slug).length, 0);
  const noData = sessions.flatMap((x) =>
    x.exercises.filter((e) => e.slug && !e.sets.length).map((e) => `${x.date}: ${e.raw}`),
  );

  console.log(`\nСессий: ${nSess}   упражнений: ${nEx}   подходов: ${nSets}`);
  console.log(`Разбор записан: ${OUT}\n`);
  if (noData.length) {
    console.log(`Упражнения без подходов (${noData.length}) — не попадут в импорт:`);
    noData.forEach((l) => console.log("  " + l));
    console.log("");
  }
  console.log(`Предупреждения (${warnings.length}):`);
  warnings.forEach((w) => console.log("  ⚠ " + w));
  console.log("\nПроверь _history-parsed.json. Потом: --write");
} else {
  const { getDb, schema } = await import("../api/_lib/db.ts");
  const sessions: ParsedSession[] = JSON.parse(readFileSync(OUT, "utf8"));
  const db = getDb();
  const now = Date.now();

  // упражнения каталога, на которые ссылаемся — upsert в Neon
  const usedSlugs = new Set(
    sessions.flatMap((s) => s.exercises.map((e) => e.slug).filter(Boolean) as string[]),
  );
  for (const e of CATALOG.filter((c) => usedSlugs.has(c.id))) {
    const row = { ...e, gifUrl: e.gifUrl ?? null, load: e.load ?? "weight", updatedAt: now, deleted: false };
    await db.insert(schema.exercises).values(row as never).onConflictDoUpdate({ target: schema.exercises.id, set: row as never });
  }

  let sCount = 0;
  let lCount = 0;
  for (const sess of sessions) {
    const withData = sess.exercises.filter((e) => e.slug && e.sets.length);
    if (!withData.length && !sess.note.length) continue;
    const ymd = sess.date.replace(/-/g, "");
    const sid = `imp-${ymd}`;
    const srow = {
      id: sid,
      versionId: "v1",
      day: null,
      startedAt: sess.epoch,
      finishedAt: sess.epoch,
      source: "import",
      note: sess.note.join("\n") || null,
      updatedAt: now,
      deleted: false,
    };
    await db.insert(schema.sessions).values(srow as never).onConflictDoUpdate({ target: schema.sessions.id, set: srow as never });
    sCount++;

    let setNo = new Map<string, number>();
    for (const ex of withData) {
      for (const st of ex.sets) {
        const k = ex.slug!;
        const num = (setNo.get(k) ?? 0) + 1;
        setNo.set(k, num);
        const lid = `imp-${ymd}-${k}-${num}`;
        const lrow = {
          id: lid,
          sessionId: sid,
          exerciseId: k,
          setNumber: num,
          weight: st.weight,
          reps: st.reps,
          rir: null,
          backFeel: null,
          loggedAt: sess.epoch,
          updatedAt: now,
          deleted: false,
        };
        await db.insert(schema.setLogs).values(lrow as never).onConflictDoUpdate({ target: schema.setLogs.id, set: lrow as never });
        lCount++;
      }
    }
  }
  console.log(`Залито в Neon: ${sCount} сессий, ${lCount} подходов. Синкнутся на устройство при следующем заходе.`);
}
