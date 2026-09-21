# Фаза 6 — Тесты и QA

Результат фазы: полный набор unit/integration/e2e с зелёным CI.
Тесты пишутся по ходу (в шагах), здесь — консолидация инфраструктуры и покрытия.

---

## Шаг 6.1 — Backend integration/e2e инфраструктура

**Цель:** изолированные интеграционные тесты на реальной БД.

**Артефакты:**
- `apps/backend/test/setup.ts`, `test/utils/db.ts`, `jest-e2e.json` — базовый harness заведён в 1.2, здесь консолидация
- Отдельная тестовая БД (`DATABASE_URL_TEST`)
- `truncate`-хелпер между тестами; supertest-обёртка с логином

**Зависимости:** 2.1–2.7, 3.1.

**Definition of Ready:** все доменные шаги `done`.

**Действия:**
1. Тестовая БД на `DATABASE_URL_TEST` (harness заведён в 1.2); `prisma migrate deploy` перед прогоном.
   Интеграционные наборы идут отдельной командой `test:e2e`, чтобы `pnpm test` (unit) не требовал БД;
   здесь консолидируются наборы, добавленные в шагах 1.2–2.7.
2. Очистка между тестами (truncate всех таблиц, кроме `_prisma_migrations`).
3. Хелпер `loginAs(role)` → access-токен.
4. Настроить coverage threshold: сервисы ≥ 80%.

**Тесты:** сами интеграционные наборы по модулям.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
pnpm --filter @min-trello/backend test:cov
```

**Ожидаемый результат (DoD):** наборы зелёные и детерминированы; coverage ≥ порога; параллельный запуск не флакает.

**Откат:** revert инфраструктуры (тесты остаются unit).
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test && pnpm --filter @min-trello/backend test:e2e`.
**Оценка:** 1 день.
**Commit:** `test(backend): isolated integration/e2e infrastructure and coverage`

---

## Шаг 6.2 — Frontend unit + Storybook

**Цель:** покрытие хуков/компонентов и визуальная база.

**Артефакты:** `vitest.config.ts`, `src/test/setup.ts`, MSW для API-моков, stories.

**Зависимости:** 5.1–5.11.

**DoR:** экраны готовы.

**Действия:**
1. MSW-хендлеры для auth/boards/cards/activity.
2. Тесты: auth-store, ky-интерцептор, optimistic move, фильтр-стор, markdown-рендер (XSS).
3. Stories для ключевых UI.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; `pnpm storybook`.

**DoD:** критичные хуки покрыты; stories собираются.

**Откат:** revert.
**Продолжение:** `pnpm --filter @min-trello/frontend test`.
**Оценка:** 1 день.
**Commit:** `test(frontend): vitest, msw and storybook stories`

---

## Шаг 6.3 — Playwright E2E

**Цель:** сквозные сценарии на seed-данных в CI.

**Артефакты:** `e2e/*.spec.ts`, `playwright.config.ts` (`webServer`), `e2e/auth.setup.ts` (storageState).

**Зависимости:** 4.1, 5.x.

**DoR:** seed и все экраны готовы.

**Действия:**
1. `webServer`: поднять backend+frontend (или compose) на тестовой БД, применить миграции и seed.
2. `auth.setup.ts` — сохранение сессии.
3. Сценарии: регистрация/логин; создание доски и колонки; создание карточки; DnD между колонками;
   фильтры; комментарий; live (2 контекста).
4. Стабильность: явные ожидания вместо sleep; reset данных перед прогоном.

**Команда проверки:**
```bash
pnpm e2e
pnpm exec playwright show-report
```

**DoD:** 5 ключевых сценариев зелёные, воспроизводимы, не флакают на повторном прогоне.

**Откат:** revert.
**Продолжение:** `pnpm e2e -- --grep <сценарий>`.
**Оценка:** 1.5 дня.
**Commit:** `test(e2e): playwright scenarios with seeded data`
