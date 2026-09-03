# Исторический дневник Григория (сырьё для импорта)

Прислано 2026-09-03. Год везде 2026. Формат вольный — парсить в `session` + `setLog` по плану 03.

**Что видно из этих данных:**
- Григорий тренируется **не по программе Никиты** — свой PPL-подобный сплит (спина / грудь-плечи-трицепс / ноги), состав упражнений плавает.
- Много кардио (бег, велотренажёр) — сейчас в модели нет, нужен тип «cardio».
- Записи бывают «хаотичные», иногда только одно-два упражнения, иногда пропуск в месяц.
- Запись подходов: `вес reps, reps, reps` (вес переносится) или `вес reps*N` (N подходов).

Вывод для платформы: **сессия не должна быть привязана к дню программы.** Свободный выбор упражнений — норма, план — опция.

---

```
01.05.26
Спина
Лучше сначала lat pull, а потом pull d
Low pull 45kg, 4 подхода, в среднем 12
Pull down 60kg, 12, 12, 10,
Lat pull 40 kg, 12, 11, 11
Трапеция 15kg 12, 20kg 12, 22.5kg 12

03.05
Бег 15 мин, 2.1 км, горка 3-5-7
Велик 23 мин, 7.69, горка 20-25
Ноги:
Seated leg press 70kg, 12, 12, 10,
Hip abduction 80kg, 12, 12, 12
Glute 50-55kg, 12, 12, 12, 13

06.05
Бег 3.2 км 23 мин, горка 2-5
Велосипед 28 мин, 7.6 км, 20 сопротивления
Спина
Pull d 60 kg 15, 70kg 11, 60kg 12,
Lat pull 40 kg 15, 50 kg 11, 11, 8
Low pull 45kg, 4 подхода, в среднем 12

10.05
Бег 3 км, 20 мин, горка 3-5-8
Велик 6.7 км, 21 мин, горка 20-25
Грудь
Жим лежа 20 кг 10, 10, 10

15.05
Pull d 60 kg 15, 55 kg 17, 65 kg 12,
Lat pull 50 kg 10, 40 kg
Low pull 45kg,

17.05
Incline Dumbbell Press 12 kg 12, 12, 12, 10
Cable Lateral Raises 10kg 12, 10, 10, 9
Triceps Rope Pushdown 35 kg 14, 45 kg 9, 35 kg 11, 30 kg 12,
Hip adduction 70 kg 12, 12, 12
Glute 50 kg, 12, 12, 12

19.05
Pull d 75 kg 10, 60 kg 15, 15, 15
Chest-Supported Row 30 kg 13, 13, 13, 13
Dumbbell Hammer Curls 8 kg 12, 12, 12, 12
Велосипед 26:00 10.24 км

21.05
Велосипед 30 мин 13 км

23.05
Cable Lateral Raises 10kg 15*4
Triceps Rope Pushdown 30 kg 12 * 4
Incline Dumbbell Press 12.5 kg *4
Chest-Supported Row 10 kg 12*3
Велосипед 5.8 ки 14 мин

24.05
Seated leg press 75kg, 12*4
Hip addiction 80 kg 12*6
Leg extension 80 kg 12*4
Lat pull 50 kg 12*3
Low pull 40 kg 12*3
Велосипед 8 км 22 мин. Сопротивление 20

26.05
Seated Dumbbell Shoulder Press 15kg 12*4
Triceps Rope Pushdown 35 kg 12*4
Face pulls 24kg 12*4
Pec fly rear deltoit 40 kg 12*4
Upper push chest 25kg 12*4

28.05
Chest-Supported Row 15 kg 12*4
Lat Pulldown 40 kg 15*4
Low pull 25 kg 15*4
Face pull 24 kg 12*4

01.06
Incline Dumbbell Press 20 kg 8*4
Pec deck 30 kg 15, 45 kg 12, 12, 55 kg 12
Machine Shoulder Press 20 kg 8*4
Cable Lateral Raises 10 kg 10*4

03.06
Dumbbell Hammer 12.5 kg 12*4
Face pulls 30kg 12*4
Chest-Supported Row 15kg 12*4
Lat pull 40kg 12*4
Pec deck rear deltoid 20kg 12*4
Велосипед 15 мин 6км, 20 сопротивление

05.06
Incline Dumbbell Press 12 раз:  15kg, 17.5 kg, 20 kg, 20 kg
Pec Deck 12 45 kg, 10 50 kg, 10 50kg, 10 45kg, 10 45kg
Cable Lateral Raises 10 kg 12*4
Triceps Rope Pushdown 36 kg 12, 40 kg 12,

07.06
Seated Leg Press 75 kg 12*4
Lying/Seated Leg Curls 45kg 12*4
Leg Extension
Hip Adduction (сведение) 70 kg 12*4
Hip Adduction (разведение) 80 kg 12, 90 kg 12*3
Скручивания на пресс в блочном тренажере

09.06
Chest-Supported Row 30 kg 12*4
Lat Pulldown 45 kg 12, 60 kg 10, 50 kg 10, 45 kg 14, 45 kg 12
Pec Deck Rear Deltoid (Обратные разведения в тренажере) 20 kg 12*4
Face Pulls 28 kg 12*4
Dumbbell Hammer Curls

11.06
Incline Dumbbell Press 18 kg 12*4
Pec Deck 50kg 12*4
Cable Lateral Raises 10kg 12*4
Triceps Rope Pushdown 45kg 12*4

13.06
Chest-Supported Row 35kg 10*4
Lat Pulldown 45 kg 15*4
Pec Deck Rear Deltoid (Обратные разведения в тренажере) 25 kg 12*4
Face Pulls 28kg 12*4
Dumbbell Hammer Curls

22.06
Incline Dumbbell Press 20kg 12*4
Barbell bench press 50kg 6*3
Pec Deck 50kg 12*4
Cable Lateral Raises 6kg 10*4
Triceps Rope Pushdown 36kg 12*4

26.06
Chest-Supported Row 30 kg 12*4
Lat Pulldown 48kg 12*4
Pec Deck Rear Deltoid (Обратные разведения в тренажере) 25kg 12*4
Face Pulls 28kg 12*4
Dumbbell Hammer Curls

02.07
Seated Leg Press 75 kg 12*4
Lying/Seated Leg Curls 45kg 12*4
Leg Extension
Hip Adduction (сведение) 70 kg 12*4
Hip Adduction (разведение) 80 kg 12, 90 kg 12*3

04.07
Chest-Supported Row 30 kg 12*4
Lat Pulldown 48kg 12*4
Pec Deck Rear Deltoid (Обратные разведения в тренажере) 25kg 12*4
Face Pulls 28kg 12*4
Dumbbell Hammer Curls

06.07
Incline Dumbbell Press 22kg 12*4
Pec Deck 45kg 12*4
Cable Lateral Raises 6kg 10*4
Triceps Rope Pushdown 45kg 12*4
Chest press 40 kg 12*3

07.07
Немного хаотичная тренировка
Chest-Supported Row 40 kg 10*4
Seated Leg Press 85 kg 12*3
Lying/Seated Leg Curls 45kg 12*4

09.07
Lat Pulldown 40kg 15, 56kg 12, 64kg 10, 72kg 4, 36kg 8
Face pulls 28kg 12, 44kg 12, 52kg 10
Triceps Rope Pushdown 52kg 10*3
Pec Deck Rear Deltoid 25kg 12, 30kg 8, 20kg 12,

11.07
Chest-Supported Row 40 kg 10*4
Lying/Seated Leg Curls 40kg 10*4
Pec Deck Rear Deltoid 35kg 10, 9

13.07
Chest-Supported Row 50 kg 10*4
Lat Pulldown 40kg 15, 56kg 12, 56kg 8, 56kg 6
Pec Deck Rear Deltoid 35kg 10, 9

14.07
Pec Deck 50kg 15, 65kg 8, 6, 6, 60kg
Triceps Rope Pushdown 45kg 12, 55kg 6, 50kg

15.07
Горы

16.07
Face pulls 50kg 12, 60kg 8, 65 13, 70 10,
Lat Pulldown 40kg 15, 56kg 12, 56kg 8, 56kg 6

18.07
Pec deck rear 35kg 10,

20.08, спустя месяц
Разминка
Chest-Supported Row 40 kg 12, 50 kg 8, 8,
Lat Pulldown 40 kg 15, 55 kg 12, 60 kg 11, 11
Face Pulls 50 kg 12, 10, 8, 8, 8
Pec Deck Rear Deltoid 25kg 10, 9, 9

22.08
Pec Deck 35kg 12, 55 kg 12, 70kg 8, 7
Cable Lateral Raises 10kg 12, 15kg 8, 7
Triceps Rope Pushdown 45kg 12, 55kg 6, 50kg

24.08
Seated Leg Press 85kg 12*4
Lying/Seated Leg Curls 60kg 12*4
Leg Extension 85kg 12*4
Biceps 15kg 10*4

25.08
Chest-Supported Row 40kg 8*4
Lat Pulldown 50kg 12, 60kg
Pec Deck Rear Deltoid (Обратные разведения в тренажере) 35kg 10, 9,
Face Pulls 44kg 10*4
T-bar 35kg 8*3

29.09
Incline Dumbbell Press 40kg 11, 50kg 7, 45kg 6, 6
Pec Deck 60 kg 12, 65 kg 7, 70kg 6, 65kg 6
Cable Lateral Raises 10 kg 8, 8, 7
Triceps Rope Pushdown 48 kg 8, 8, 8, 8
```

## Ориентир по маппингу названий → канон

| В дневнике | Канон (слаг) |
|---|---|
| Low pull, Low pull | seated-cable-row-retract (или новый `seated-cable-row`) |
| Pull d, Pull down, Lat pull, Lat Pulldown | `lat-pulldown` (не false-grip версия Никиты) |
| Трапеция | `shrug` (новый) |
| Seated leg press, Seated Leg Press | `leg-press` |
| Hip abduction, Hip Adduction (разведение) | `hip-abduction` |
| Glute | `glute-machine` (новый — уточнить у Григория, что за тренажёр) |
| Hip adduction, Hip Adduction (сведение) | `hip-adduction` |
| Chest-Supported Row | `chest-supported-row` (новый) |
| Incline Dumbbell Press | `incline-db-press` |
| Cable Lateral Raises | `lateral-raise-cable` (новый или = lateral-raise-machine) |
| Triceps Rope Pushdown | `triceps-pushdown` (канатный) |
| Dumbbell Hammer Curls, Dumbbell Hammer, Biceps | `hammer-curl` (новый) |
| Face pulls, Face pull, Face Pulls | `face-pull` |
| Pec deck, Pec Deck | `pec-deck` (новый — прямой, не reverse) |
| Pec fly rear deltoit, Pec deck rear deltoid, Pec Deck Rear Deltoid | `reverse-pec-deck` |
| Seated Dumbbell Shoulder Press, Machine Shoulder Press | `shoulder-press` (новый) |
| Upper push chest, Chest press | `chest-press-machine` (новый) |
| Жим лежа, Barbell bench press | `barbell-bench` (новый) |
| Leg extension, Leg Extension | `leg-extension` |
| Lying/Seated Leg Curls | `lying-leg-curl` / `seated-leg-curl` |
| Скручивания на пресс в блочном тренажере | `cable-crunch` (новый) |
| T-bar | `t-bar-row` (новый) |
| Бег | cardio: `run` |
| Велик, Велосипед | cardio: `bike` |
