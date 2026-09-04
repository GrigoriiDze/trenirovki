/* ============================================================
   Программа «Full body 1», версия v1.
   Источник — context/03-programma-abc.md. Правишь программу —
   заводишь v2, эту не трогаешь (см. CLAUDE.md).
   ============================================================ */

import type { DayCode, Exercise, Origin } from "~/db/schema";

/** Упражнение без полей синхронизации — их проставит seed.
 *  load по умолчанию "weight", указываем только исключения. */
export type ExerciseSeed = Omit<Exercise, "updatedAt" | "deleted" | "gifUrl" | "load"> & {
  gifUrl?: string | null;
  load?: Exercise["load"];
};

export const PROGRAM_VERSION_ID = "v1";
export const PROGRAM_NAME = "Full body 1";

export const EXERCISES: ExerciseSeed[] = [
  // --- кор ---
  {
    id: "dead-bug",
    nameRu: "Мёртвый жук",
    nameEn: "dead bug",
    muscle: "кор",
    equipment: "вес тела",
    rom: "iso",
    load: "bw",
    restSec: 45,
    cue: "Поясница прижата к полу всё время — оторвалась, значит нога ушла слишком далеко. Это замена скручиваниям.",
  },
  {
    id: "side-plank",
    nameRu: "Боковая планка",
    nameEn: "side plank",
    muscle: "кор",
    equipment: "вес тела",
    rom: "iso",
    load: "time",
    restSec: 45,
    cue: "Корпус в линию, таз не проваливается. Работает квадратная мышца поясницы — стабилизатор поясничного отдела сбоку.",
  },
  {
    id: "pallof-press",
    nameRu: "Pallof press",
    nameEn: "pallof press",
    muscle: "кор",
    equipment: "блок",
    rom: "iso",
    restSec: 45,
    gifUrl: "/exercises/pallof-press.png",
    cue: "Боком к блоку, выжимаешь рукоятку от груди и не даёшь корпусу повернуться. Анти-ротация — то, чего нет в тренажёрах.",
  },
  {
    id: "bird-dog",
    nameRu: "Птица-собака",
    nameEn: "bird dog",
    muscle: "кор",
    equipment: "вес тела",
    rom: "iso",
    load: "bw",
    restSec: 45,
    gifUrl: "/exercises/bird-dog.png",
    cue: "Противоположные рука и нога, поясница неподвижна. Таз качается — сократи амплитуду ноги.",
  },

  // --- поясница / задняя цепь ---
  {
    id: "back-extension-45",
    nameRu: "Гиперэкстензия 45°",
    nameEn: "45° back extension",
    muscle: "поясница",
    equipment: "тренажёр",
    rom: "full",
    restSec: 60,
    cue: "Спина нейтральная, движение в тазобедренном суставе, не в пояснице. Вверху — в линию, без переразгибания. Постоянное напряжение.",
  },
  {
    id: "lying-leg-curl",
    nameRu: "Сгибание ног лёжа",
    nameEn: "lying leg curl",
    muscle: "бицепс бедра",
    equipment: "тренажёр",
    rom: "lengthened",
    restSec: 90,
    gifUrl: "/exercises/lying-leg-curl.png",
    cue: "Подкладка под таз. Опускай до полного выпрямления, 3 секунды вниз. Растянутая фаза — весь смысл упражнения.",
  },
  {
    id: "seated-leg-curl",
    nameRu: "Сгибание ног сидя",
    nameEn: "seated leg curl",
    muscle: "бицепс бедра",
    equipment: "тренажёр",
    rom: "lengthened",
    restSec: 90,
    cue: "Сидя бицепс бедра в более растянутой позиции, чем лёжа — поэтому в день C именно сидя. Полная амплитуда.",
  },
  {
    id: "hip-thrust",
    nameRu: "Ягодичный мост со штангой",
    nameEn: "barbell hip thrust",
    muscle: "ягодицы",
    equipment: "штанга",
    rom: "full",
    restSec: 90,
    gifUrl: "/exercises/hip-thrust.jpg",
    cue: "Подбородок к груди, рёбра вниз, наверху пауза 2 сек. Выпрямление ягодицей, не прогибом поясницы. Чувствуешь поясницу — прогнулся, а не дожал.",
  },
  {
    id: "hip-abduction",
    nameRu: "Отведение бедра в тренажёре",
    nameEn: "hip abduction machine",
    muscle: "ягодицы",
    equipment: "тренажёр",
    rom: "full",
    restSec: 60,
    gifUrl: "/exercises/hip-abduction.jpg",
    cue: "Наклон корпуса вперёд ~30° — так средняя ягодичная в лучшем векторе. Сильная ягодица снимает работу с поясничных разгибателей.",
  },
  {
    id: "hip-adduction",
    nameRu: "Сведение бёдер в тренажёре",
    nameEn: "hip adduction machine",
    muscle: "приводящие",
    equipment: "тренажёр",
    rom: "full",
    restSec: 60,
    gifUrl: "/exercises/hip-adduction.png",
    cue: "Наклон вперёд от таза можно, прогиб в пояснице — нет. Спина нейтральная. Это правка к тому, что показывал Никита.",
  },

  // --- квадрицепс ---
  {
    id: "leg-press",
    nameRu: "Жим ногами",
    nameEn: "leg press",
    muscle: "квадрицепс",
    equipment: "тренажёр",
    rom: "lengthened",
    restSec: 90,
    gifUrl: "/exercises/leg-press.png",
    cue: "Стопы чуть выше центра платформы, ширина плеч. Опускай ровно до точки, где таз ещё прижат — это твоя нижняя точка, ниже никогда.",
  },
  {
    id: "leg-press-narrow",
    nameRu: "Жим ногами, узкая постановка",
    nameEn: "leg press, narrow stance",
    muscle: "квадрицепс",
    equipment: "тренажёр",
    rom: "lengthened",
    restSec: 90,
    gifUrl: "/exercises/leg-press-narrow.jpg",
    cue: "Стопы ниже и уже, чем в день B — акцент в квадрицепс. Тот же лимит: таз прижат.",
  },
  {
    id: "leg-extension",
    nameRu: "Разгибание голени",
    nameEn: "leg extension",
    muscle: "квадрицепс",
    equipment: "тренажёр",
    rom: "full",
    restSec: 60,
    gifUrl: "/exercises/leg-extension.png",
    cue: "Отклонись назад в спинку — это удлиняет прямую мышцу бедра. Не выпрямляй колено в замок рывком.",
  },

  // --- спина / тяги ---
  {
    id: "lat-pulldown-wide",
    nameRu: "Тяга верхнего блока широким хватом",
    nameEn: "wide-grip lat pulldown",
    muscle: "широчайшие",
    equipment: "блок",
    rom: "full",
    restSec: 90,
    cue: "Хват-крюк, большой палец сверху, плечи опущены, локти вперёд. Вверху дай лопатке подняться и растянуть широчайшую.",
  },
  {
    id: "reverse-grip-pulldown",
    nameRu: "Тяга верхнего блока обратным узким хватом",
    nameEn: "reverse-grip pulldown",
    muscle: "широчайшие",
    equipment: "блок",
    rom: "full",
    restSec: 90,
    cue: "Локти идут вдоль корпуса вниз-назад. Другой вектор на широчайшую, чем в день A.",
  },
  {
    id: "seated-cable-row-retract",
    nameRu: "Тяга горизонтального блока со сведением лопаток",
    nameEn: "seated cable row, scapular retraction",
    muscle: "верх спины",
    equipment: "блок",
    rom: "full",
    restSec: 90,
    gifUrl: "/exercises/seated-cable-row-retract.png",
    cue: "Довёл рукоятку — свёл лопатки и держи 1 сек. Локти вдоль корпуса. Лекарство от холки, у Никиты этого нет.",
  },
  {
    id: "single-arm-cable-row",
    nameRu: "Тяга одной рукой в блоке",
    nameEn: "single-arm cable row",
    muscle: "широчайшие",
    equipment: "блок",
    rom: "full",
    restSec: 75,
    gifUrl: "/exercises/single-arm-cable-row.png",
    cue: "Корпус не разворачивается — это работа от Pallof. В конце дай лопатке уехать к позвоночнику.",
  },
  {
    id: "face-pull",
    nameRu: "Тяга к лицу",
    nameEn: "face pull",
    muscle: "задняя дельта",
    equipment: "блок",
    rom: "full",
    restSec: 60,
    cue: "Блок на уровне лица, локти выше кистей, в конце развести и свести лопатки. Второе упражнение, которое Никита задолжал.",
  },

  // --- грудь ---
  {
    id: "machine-chest-press",
    nameRu: "Жим в тренажёре на грудь",
    nameEn: "machine chest press",
    muscle: "грудь",
    equipment: "тренажёр",
    rom: "lengthened",
    restSec: 90,
    cue: "Лопатки сведены и прижаты к спинке, как на pec dec. Опускай до лёгкой растяжки груди, не глубже — плечо пока нестабильное.",
  },
  {
    id: "incline-db-press",
    nameRu: "Жим гантелей на наклонной 30°",
    nameEn: "incline dumbbell press",
    muscle: "грудь",
    equipment: "гантели",
    rom: "lengthened",
    restSec: 90,
    gifUrl: "/exercises/incline-db-press.png",
    cue: "Лопатки сведены и прижаты к скамье. Плечо щёлкает или тянет спереди — замени на тренажёр с фиксированной траекторией.",
  },

  // --- плечи ---
  {
    id: "lateral-raise-machine",
    nameRu: "Средняя дельта, прямая рука",
    nameEn: "lateral raise machine / cable",
    muscle: "средняя дельта",
    equipment: "тренажёр",
    rom: "short",
    restSec: 60,
    gifUrl: "/exercises/lateral-raise-machine.jpg",
    cue: "Рука выпрямлена, локоть не назад, лёгкая сутулость по технике Никиты. Короткая амплитуда здесь оправдана: в растяжке у дельты плечо рычага почти нулевое.",
  },
  {
    id: "reverse-pec-deck",
    nameRu: "Обратные разведения в тренажёре",
    nameEn: "reverse pec deck",
    muscle: "задняя дельта",
    equipment: "тренажёр",
    rom: "short",
    restSec: 60,
    cue: "Как учил Никита: голова вперёд, спина округлена, развести ~35°, руки назад не закидывать. Здесь его техника правильная.",
  },
  {
    id: "y-raise-incline",
    nameRu: "Y-подъём лёжа на наклонной",
    nameEn: "prone incline Y-raise",
    muscle: "трапеция",
    equipment: "гантели",
    rom: "full",
    restSec: 60,
    cue: "Грудью на скамье под 30°, руки в букву Y большими пальцами вверх. Вес 2–4 кг. Прямая работа на нижнюю трапецию — она тянет лопатку вниз и не даёт расти холке.",
  },

  // --- руки ---
  {
    id: "cable-curl",
    nameRu: "Сгибание рук на блоке",
    nameEn: "cable curl",
    muscle: "бицепс",
    equipment: "блок",
    rom: "full",
    restSec: 60,
    gifUrl: "/exercises/cable-curl.png",
    cue: "Локти зафиксированы у корпуса, полная амплитуда.",
  },
  {
    id: "triceps-pushdown",
    nameRu: "Разгибание рук на блоке, V-гриф",
    nameEn: "triceps pushdown, V-bar",
    muscle: "трицепс",
    equipment: "блок",
    rom: "short",
    restSec: 60,
    cue: "Плечо перпендикулярно полу, подмышки прижаты, сгиб до 90°. Ровно как показывал.",
  },

  // --- икры ---
  {
    id: "standing-calf-raise",
    nameRu: "Подъём на носки",
    nameEn: "standing calf raise",
    muscle: "икры",
    equipment: "тренажёр",
    rom: "lengthened",
    restSec: 45,
    gifUrl: "/exercises/standing-calf-raise.png",
    cue: "Пауза 1 сек внизу, в растяжке. Икра растёт почти исключительно с растянутой позиции.",
  },
];

export interface SlotSeed {
  exerciseId: string;
  targetSets: number;
  repLow: number;
  repHigh: number;
  perSide?: boolean;
  origin: Origin;
}

export const DAY_TITLES: Record<DayCode, string> = {
  A: "Спина, задняя поверхность бедра, плечи",
  B: "Ноги, грудь, руки",
  C: "Ягодицы, осанка, плечи",
};

export const DAY_NOTES: Record<DayCode, string> = {
  A: "Отдых: 90 сек тяги/жимы, 60 дельты/руки, 45 кор. Запас — 2 повтора, кроме последнего подхода в упражнении.",
  B: "Единственный день с ногами под нагрузкой. На жиме ногами таз прижат к спинке всегда: подвернулся — это нижняя точка, ниже не идёшь.",
  C: "День осанки. Нижняя трапеция и задняя дельта работают на холку. Y-подъём не выкидывать — он самый скучный и самый нужный.",
};

const A: SlotSeed[] = [
  { exerciseId: "dead-bug", targetSets: 3, repLow: 8, repHigh: 8, perSide: true, origin: "added" },
  { exerciseId: "back-extension-45", targetSets: 3, repLow: 12, repHigh: 12, origin: "nikita" },
  { exerciseId: "lying-leg-curl", targetSets: 3, repLow: 10, repHigh: 12, origin: "changed" },
  { exerciseId: "lat-pulldown-wide", targetSets: 4, repLow: 8, repHigh: 12, origin: "nikita" },
  { exerciseId: "seated-cable-row-retract", targetSets: 3, repLow: 10, repHigh: 12, origin: "added" },
  { exerciseId: "machine-chest-press", targetSets: 3, repLow: 10, repHigh: 12, origin: "nikita" },
  { exerciseId: "lateral-raise-machine", targetSets: 4, repLow: 12, repHigh: 15, origin: "nikita" },
  { exerciseId: "cable-curl", targetSets: 2, repLow: 12, repHigh: 12, origin: "neutral" },
  { exerciseId: "side-plank", targetSets: 2, repLow: 30, repHigh: 40, perSide: true, origin: "added" },
];

const B: SlotSeed[] = [
  { exerciseId: "pallof-press", targetSets: 3, repLow: 10, repHigh: 10, perSide: true, origin: "added" },
  { exerciseId: "leg-press", targetSets: 3, repLow: 10, repHigh: 12, origin: "added" },
  { exerciseId: "leg-extension", targetSets: 3, repLow: 12, repHigh: 15, origin: "neutral" },
  { exerciseId: "hip-abduction", targetSets: 3, repLow: 15, repHigh: 15, origin: "added" },
  { exerciseId: "incline-db-press", targetSets: 3, repLow: 8, repHigh: 12, origin: "neutral" },
  { exerciseId: "single-arm-cable-row", targetSets: 3, repLow: 10, repHigh: 12, origin: "neutral" },
  { exerciseId: "face-pull", targetSets: 3, repLow: 15, repHigh: 15, origin: "added" },
  { exerciseId: "triceps-pushdown", targetSets: 3, repLow: 10, repHigh: 12, origin: "nikita" },
  { exerciseId: "standing-calf-raise", targetSets: 3, repLow: 15, repHigh: 15, origin: "neutral" },
];

const C: SlotSeed[] = [
  { exerciseId: "bird-dog", targetSets: 3, repLow: 8, repHigh: 8, perSide: true, origin: "added" },
  { exerciseId: "hip-thrust", targetSets: 3, repLow: 10, repHigh: 12, origin: "added" },
  { exerciseId: "leg-press-narrow", targetSets: 3, repLow: 12, repHigh: 12, origin: "added" },
  { exerciseId: "seated-leg-curl", targetSets: 3, repLow: 10, repHigh: 12, origin: "nikita" },
  { exerciseId: "hip-adduction", targetSets: 2, repLow: 15, repHigh: 15, origin: "changed" },
  { exerciseId: "reverse-grip-pulldown", targetSets: 3, repLow: 10, repHigh: 12, origin: "neutral" },
  { exerciseId: "y-raise-incline", targetSets: 3, repLow: 12, repHigh: 12, origin: "added" },
  { exerciseId: "reverse-pec-deck", targetSets: 3, repLow: 12, repHigh: 15, origin: "nikita" },
  { exerciseId: "lateral-raise-machine", targetSets: 3, repLow: 15, repHigh: 15, origin: "nikita" },
];

export const DAYS: Record<DayCode, SlotSeed[]> = { A, B, C };

/** Порядок ротации. Следующий день — от последней завершённой сессии. */
export const ROTATION: DayCode[] = ["A", "B", "C"];
