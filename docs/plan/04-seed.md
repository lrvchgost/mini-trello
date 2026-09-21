# Фаза 4 — Seed

Результат фазы: детерминированные демо-данные и команда полного сброса.

---

## Шаг 4.1 — Seed + db:reset

**Цель:** приложение стартует с реалистичным набором; повторный запуск не дублирует данные.

**Артефакты:**
- `apps/backend/prisma/seed.ts`
- `apps/backend/prisma/seed.check.ts` (smoke-проверка счётчиков)
- скрипты `db:seed`, `db:reset`, `test:seed` в корне и `apps/backend`
- данные: **2 пользователя × 3 доски × 20 задач = 120**

**Зависимости:** 1.2, 2.x (схема и операции).

**Definition of Ready:** 2.1–2.5 `done`; миграции применены.

**Действия:**
1. `prisma/seed.ts` на `upsert` (идемпотентность по детерминированным id/email).
2. Пользователи: `alice@example.com`, `bob@example.com`, пароль `password123` (bcryptjs-хеш).
3. На каждого: 3 доски (напр. «Личное», «Работа», «Учёба»), в каждой колонки To Do / In Progress /
   Done (`isDone = true`); исполнитель карточек — владелец доски (ownership, ADR-008).
4. 20 задач на доску (итого 120, по 60 на пользователя): случайно-стабильные приоритеты (все 4 значения),
   часть с дедлайнами (в т.ч. просроченными), метками, исполнителями, 1–3 комментариями.
5. `db:reset` = `prisma migrate reset --force` + `db seed` (только dev).
6. `createdAt/updatedAt` в прошлом, чтобы графики/overdue выглядели реалистично.

**Тесты:** smoke-скрипт (или integration): после seed — ровно 2 user, 6 board, 120 card,
есть все приоритеты, есть overdue, есть комментарии; повторный seed не меняет количество.

**Команда проверки:**
```bash
pnpm db:reset
pnpm db:seed
pnpm --filter @min-trello/backend test:seed   # smoke: 2 пользователя / 6 досок / 120 задач
pnpm --filter @min-trello/backend exec prisma studio   # визуально
```

**Ожидаемый результат (DoD):**
- `2 / 6 / 120` и наполнение по требованиям; повторный `db:seed` идемпотентен.

**Откат:** `pnpm db:reset` (dev) — данные пересоздаются.
**Продолжение после паузы:** `pnpm db:seed` + счётчики; если расходится — `db:reset`.
**Оценка:** 1 день.
**Commit:** `feat(seed): demo users, boards and tasks with reset script`
