# Фаза 5 — Frontend

Результат фазы: рабочий SPA со всеми экранами, DnD, live-обновлениями и адаптивом.
Общая проверка каждого шага: `pnpm --filter @min-trello/frontend test` + smoke в браузере.

> Перед фазой выполнить seed (шаг 4.1); smoke-проверки опираются на демо-данные (2 юзера × 3 доски × 20 задач).

---

## Шаг 5.1 — Skeleton приложения

**Цель:** каркас Vite + React, клиент API, авторизация, роутинг.

**Артефакты:**
- `apps/frontend/*` (Vite, React, TS)
- `src/app/{App.tsx,providers.tsx,routes.tsx}`
- `src/shared/api/ky-client.ts` (+ интерцептор refresh), `src/shared/config/env.ts`
- `src/features/auth/{store.ts,useAuth.ts}` (Zustand)
- `src/shared/ui/protected-route.tsx`

**Зависимости:** 0.2, 1.3.

**Definition of Ready:** shared собран; auth-эндпоинты работают.

**Действия:**
1. Vite-скаффолд; alias `@`, подключение `@min-trello/shared`.
2. `providers.tsx`: `QueryClientProvider`, `BrowserRouter`, Theme.
3. `ky-client`: `prefixUrl`, `credentials: 'include'`, access в памяти,
   заголовок `X-Client-Id` на мутирующих запросах,
   на 401 → `/api/auth/refresh` → повтор; при провале — logout.
   Refresh — **single-flight** (`refreshPromise`) и межвкладочный `navigator.locks`
   (`BroadcastChannel` для раздачи токена), чтобы параллельные 401 не ротировали токен конкурентно.
4. `useAuth`: login/register/logout, bootstrapping через `/auth/refresh` + `/auth/me`.
5. `ProtectedRoute` + реакция на 401.

**Тесты:** Unit — интерцептор (refresh и повтор), auth-store (login/logout/bootstrap).

**Команда проверки:**
```bash
pnpm --filter @min-trello/frontend test
pnpm --filter @min-trello/frontend dev   # localhost:5173
```

**Ожидаемый результат (DoD):** без сессии редирект на `/login`; после логина сессия сохраняется после F5.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/frontend dev` → открыть `/` и проверить редирект.
**Оценка:** 1.5 дня.
**Commit:** `feat(frontend): app skeleton, api client and auth flow`

---

## Шаг 5.2 — UI kit и layout

**Цель:** дизайн-система и общий каркас.

**Артефакты:** Tailwind config, `src/shared/ui/*` (переэкспорт shadcn/ui), `src/app/layout/*`, тема, Storybook.

**Зависимости:** 5.1.

**Definition of Ready:** 5.1 `done`.

**Действия:**
1. Tailwind + shadcn/ui (Button, Input, Dialog, Dropdown, Badge, Card, Tooltip).
2. Тема (light/dark), типографика, breakpoints.
3. Layout: header (пользователь, выход), контент-область.
4. Общие состояния: `Loading`, `Empty`, `ErrorBoundary` и страница `404`.
5. Storybook с 2–3 stories.

**Тесты:** build Storybook; smoke-открытие компонентов.

**Команда проверки:** `pnpm storybook` → открывается; `pnpm --filter @min-trello/frontend build` без ошибок.

**Ожидаемый результат (DoD):** UI-кит доступен, Storybook собирается.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm storybook`.
**Оценка:** 1 день.
**Commit:** `feat(frontend): ui kit, theme and layout`

---

## Шаг 5.3 — Auth-экраны

**Артефакты:** `src/pages/login/*`, `src/pages/register/*`, формы на RHF + zod.

**Зависимости:** 5.2.

**DoR:** 5.2 `done`.

**Действия:** формы с валидацией из shared; обработка ошибок 401/422; после `register`
сервер уже выдал refresh-cookie — сразу подтянуть `/auth/me` и редиректнуть на `/dashboard`; ссылки между экранами.

**Тесты:** Unit — валидация и сабмит; smoke.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; вручную: регистрация → вход.

**DoD:** вход/регистрация работают; ошибки видны; после успеха — `/dashboard`.

**Откат:** revert.
**Продолжение:** открыть `/login` и войти seed-юзером.
**Оценка:** 0.5 дня.
**Commit:** `feat(frontend): login and register pages`

---

## Шаг 5.4 — Dashboard + графики

**Артефакты:** `src/pages/dashboard/*`, `src/widgets/stats-chart/*` (Recharts), `features/boards` (list/create).

**Зависимости:** 5.2, 2.1, 2.7.

**DoR:** 5.2, 2.1 и 2.7 `done`.

**Действия:** список досок с пагинацией и созданием; графики по `/dashboard/stats` (cardsByStatus, overdue); `ResponsiveContainer`.

**Тесты:** Unit — stats-хук, пагинация; smoke.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; вручную сравнить графики с API.

**DoD:** 3 доски seed-юзера видны; графики соответствуют stats.

**Откат:** revert.
**Продолжение:** `curl /api/dashboard/stats` и сверить UI.
**Оценка:** 1 день.
**Commit:** `feat(frontend): dashboard with stats charts`

---

## Шаг 5.5 — Board view + DnD-каркас

**Артефакты:** `src/pages/board/*`, `widgets/board-column/*`, `entities/{board,column,card}`, загрузка доски.

**Зависимости:** 5.2, 2.2.

**DoR:** 5.2 и 2.2 `done`.

**Действия:** загрузка `/boards/:id` (columns+cards); рендер колонок/карточек; переход между досками; `@hello-pangea/dnd` провайдер.

**Тесты:** Unit — рендер колонок/карточек; smoke.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; открыть доску из дашборда.

**DoD:** доска отображается из API; карточки в правильных колонках по order.

**Откат:** revert.
**Продолжение:** открыть `/boards/:id`.
**Оценка:** 1 день.
**Commit:** `feat(frontend): board view with columns and cards`

---

## Шаг 5.6 — Card modal

**Артефакты:** `widgets/card-modal/*`, Markdown (MDXEditor + react-markdown + remark-gfm + rehype-sanitize), `features/comments`, `features/cards` (labels, assignee).

**Зависимости:** 5.5, 2.3, 2.4, 2.5, 1.4.

**DoR:** 5.5 и 2.3–2.5, 1.4 `done`.

**Действия:** открытие по `/boards/:id/cards/:cardId`; CRUD карточки; markdown-редактор/рендер; метки; assignee (из `/api/users` — в ownership-модели это только текущий пользователь); комментарии; удаление.

**Тесты:** Unit — редактор/рендер, XSS-кейс (raw HTML не исполняется); smoke.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; открыть карточку, изменить описание.

**DoD:** изменения сохраняются и видны после перезагрузки; XSS не проходит.

**Откат:** revert.
**Продолжение:** открыть карточку seed-доски.
**Оценка:** 1.5 дня.
**Commit:** `feat(frontend): card modal with markdown, labels and comments`

---

## Шаг 5.7 — DnD + optimistic move

**Артефакты:** `features/cards/model/useMoveCard`, интеграция `Draggable`/`Droppable`, optimistic.

**Зависимости:** 5.6, 2.3.

**DoR:** 5.6 `done`.

**Действия:** перетаскивание между/внутри колонок; оптимистичный `onMutate` (snapshot/rollback/`onSettled` invalidate); вызов `PATCH /cards/:id/move`.

**Тесты:** Unit — optimistic hook (успех/ошибка/rollback).

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; вручную перетащить, обновить страницу — позиция сохранилась.

**DoD:** карточка перемещается; при ошибке — откат; после F5 порядок верный.

**Откат:** revert.
**Продолжение:** `curl /api/boards/:id` и сверить order.
**Оценка:** 1 день.
**Commit:** `feat(frontend): drag and drop with optimistic updates`

---

## Шаг 5.8 — Фильтры и поиск

**Артефакты:** `widgets/filter-bar/*`, `features/filters/store.ts` (Zustand), `pages/search/*`.

**Зависимости:** 5.5, 2.7.

**DoR:** 5.5 и 2.7 `done`.

**Действия:** фильтры priority/labels/assignee/deadline на доске; глобальный поиск на `/search`; debounce; синхронизация с URL-query.

**Тесты:** Unit — фильтр-стор, debounce; smoke.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; сверить результаты с API.

**DoD:** фильтры и поиск дают те же результаты, что API; состояние в URL.

**Откат:** revert.
**Продолжение:** открыть `/search?q=...`.
**Оценка:** 1 день.
**Commit:** `feat(frontend): filters and global search`

---

## Шаг 5.9 — Activity (SSE) + live (Socket.IO)

**Артефакты:** `widgets/activity-log/*`, `shared/realtime/socket.ts`, `features/*/live-subscriptions`.

**Зависимости:** 5.5, 2.6, 3.1.

**DoR:** 5.5, 2.6, 3.1 `done`.

**Действия:** SSE через `@microsoft/fetch-event-source` (Bearer); Socket.IO-подписка с токеном;
обработка событий → `invalidateQueries`; дедуп своих изменений по `clientId` вкладки; cleanup при размонтировании.
Долгие соединения переживают истечение access-токена: на `onerror` SSE и `connect_error` Socket.IO —
single-flight refresh и reconnect с новым токеном.

**Тесты:** Unit — подписки, дедуп; smoke в двух окнах.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; открыть доску в 2 окнах, изменить в одном.

**DoD:** изменение появляется во втором окне без перезагрузки; своё действие не дублируется; лог пополняется.

**Откат:** revert.
**Продолжение:** два окна доски + `curl -N .../activity/stream`.
**Оценка:** 1.5 дня.
**Commit:** `feat(frontend): live updates via socket.io and sse activity`

---

## Шаг 5.10 — Profile

**Артефакты:** `pages/profile/*`.

**Зависимости:** 5.3, 1.4.

**DoR:** 5.3 и 1.4 `done`.

**Действия:** смена имени и пароля; после смены пароля — выход/повторный вход; уведомления.

**Тесты:** Unit; smoke.

**Команда проверки:** `pnpm --filter @min-trello/frontend test`; сменить имя → обновилось в хедере.

**DoD:** профиль сохраняется; смена пароля требует повторного входа.

**Откат:** revert.
**Продолжение:** открыть `/profile`.
**Оценка:** 0.5 дня.
**Commit:** `feat(frontend): profile and password change`

---

## Шаг 5.11 — Адаптивность

**Артефакты:** стили/компоненты с брейкпоинтами, мобильные layout, touch-DnD long-press.

**Зависимости:** 5.5–5.10.

**DoR:** экраны готовы.

**Действия:** канбан на мобиле — табы колонок; карточка — fullscreen sheet; FilterBar — bottom-sheet;
Activity — вкладка; long-press для DnD; проверка графиков `ResponsiveContainer`.

**Тесты:** visual/manual; smoke на 375px и ≥1024px.

**Команда проверки:** devtools responsive 375px; пройти login→dashboard→board→card→DnD.

**DoD:** ключевые сценарии выполняются на мобиле без горизонтального скролла канбана.

**Откат:** revert.
**Продолжение:** повторить smoke.
**Оценка:** 1 день.
**Commit:** `feat(frontend): responsive layouts and touch dnd`
