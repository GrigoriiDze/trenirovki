-- trenirovki — начальная схема.
-- Зеркало локальной схемы Dexie (src/db/schema.ts) + user_id, updated_at, deleted.
-- Один пользователь: RLS везде = «только свои строки».
-- Время в приложении — epoch ms (number); здесь timestamptz, конвертация в клиенте.

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────
-- exercises — справочник движений
-- ─────────────────────────────────────────────────────────────
create table exercises (
  id          text primary key,           -- слаг: "lying-leg-curl"
  user_id     uuid not null references auth.users on delete cascade,
  name_ru     text not null,
  name_en     text not null,
  muscle      text not null,
  equipment   text not null,
  rom         text not null check (rom in ('full','lengthened','short','iso')),
  cue         text not null default '',
  rest_sec    integer not null default 60,
  gif_url     text,
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

-- ─────────────────────────────────────────────────────────────
-- program_versions — версии программы
-- ─────────────────────────────────────────────────────────────
create table program_versions (
  id            text primary key,          -- "v1"
  user_id       uuid not null references auth.users on delete cascade,
  program_name  text not null,
  created_at    timestamptz not null default now(),
  note          text,
  active        boolean not null default false,
  updated_at    timestamptz not null default now(),
  deleted       boolean not null default false
);

-- ─────────────────────────────────────────────────────────────
-- program_slots — шаблон: упражнение в дне версии
-- ─────────────────────────────────────────────────────────────
create table program_slots (
  id           text primary key,           -- "v1:A:1"
  user_id      uuid not null references auth.users on delete cascade,
  version_id   text not null references program_versions on delete cascade,
  day          text not null check (day in ('A','B','C')),
  ord          integer not null,           -- позиция в дне, с 1
  exercise_id  text not null references exercises,
  target_sets  integer not null,
  rep_low      integer not null,
  rep_high     integer not null,
  per_side     boolean not null default false,
  origin       text not null check (origin in ('nikita','changed','added','neutral')),
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index program_slots_version_day on program_slots (version_id, day);

-- ─────────────────────────────────────────────────────────────
-- sessions — проведённая или идущая тренировка
-- ─────────────────────────────────────────────────────────────
create table sessions (
  id           uuid primary key,
  user_id      uuid not null references auth.users on delete cascade,
  version_id   text not null references program_versions,
  day          text not null check (day in ('A','B','C')),
  started_at   timestamptz not null,
  finished_at  timestamptz,
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index sessions_started on sessions (user_id, started_at);

-- ─────────────────────────────────────────────────────────────
-- set_logs — один рабочий подход
-- ⚠ exercise_id ссылается на exercises напрямую, не на слот (см. CLAUDE.md)
-- ─────────────────────────────────────────────────────────────
create table set_logs (
  id           uuid primary key,
  user_id      uuid not null references auth.users on delete cascade,
  session_id   uuid not null references sessions on delete cascade,
  exercise_id  text not null references exercises,
  set_number   integer not null,
  weight       numeric not null default 0,
  reps         integer not null default 0,
  rir          integer,
  back_feel    smallint check (back_feel in (0,1,2)),
  logged_at    timestamptz not null,
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index set_logs_session on set_logs (session_id);
create index set_logs_exercise on set_logs (user_id, exercise_id, logged_at);

-- ─────────────────────────────────────────────────────────────
-- триггеры updated_at
-- ─────────────────────────────────────────────────────────────
create trigger t_exercises_updated        before update on exercises        for each row execute function set_updated_at();
create trigger t_program_versions_updated before update on program_versions for each row execute function set_updated_at();
create trigger t_program_slots_updated    before update on program_slots    for each row execute function set_updated_at();
create trigger t_sessions_updated         before update on sessions         for each row execute function set_updated_at();
create trigger t_set_logs_updated         before update on set_logs         for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — только свои строки
-- ─────────────────────────────────────────────────────────────
alter table exercises        enable row level security;
alter table program_versions enable row level security;
alter table program_slots    enable row level security;
alter table sessions         enable row level security;
alter table set_logs         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exercises','program_versions','program_slots','sessions','set_logs']
  loop
    execute format($f$
      create policy "own_select" on %1$I for select using (user_id = auth.uid());
      create policy "own_insert" on %1$I for insert with check (user_id = auth.uid());
      create policy "own_update" on %1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy "own_delete" on %1$I for delete using (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;
