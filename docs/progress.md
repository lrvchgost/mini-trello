# История шагов

Точка возобновления: последняя запись со статусом `done`. Следующий шаг — первый `todo`
с закрытыми зависимостями. Шаблон и правила — [plan/README.md](plan/README.md).

| Дата       | Шаг  | Что сделано                                                                 | Как проверить                         | Commit | Статус |
|------------|------|------------------------------------------------------------------------------|---------------------------------------|--------|--------|
| 2026-09-21 | 0.0  | Архитектурная ревизия: ADR-008 (ownership-only), снят BullMQ/@nestjs/axios, seed 20/доску, `isDone`, `404` для чужой доски, `column.*`/`clientId`, CI (redis+images), nginx SSE, dedup по `clientId` | grep-чеклист + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0a | Корректирующий проход: X-Client-Id для REST-мутаций, actorId/clientId во всех WS-payload, кросс-модульная проводка column.*, CI VITE_*, compose без env_file, фикс таблицы | grep + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0b | Фиксы ревью: complete DI-мок, exports/эмиссия BoardsGateway, resolver по `:id`, owner-only assignee, CI unit/e2e, nginx healthcheck, repos для search/dashboard/activity, isDone в API, dev-compose в README | grep + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0c | Фикс resolver: `resolveBoardId(req)` (метод + шаблон маршрута), синхронизирован план 2.1 | grep + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0d | Критичные фиксы: `log(boardId, action, payload)` + `req.board`, сортировка карточек в `findById`, `test:e2e` в CI | grep + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0e | Критичные фиксы плана: register без `upsert` (`409`), `forwardRef` Boards⇄Activity, `CORS_ORIGIN` в compose, single-flight refresh + grace, refresh токена для SSE/WS, Redis Pub/Sub для activity, `DATABASE_URL_TEST` в CI, `${VAR:-default}` в compose, раздельные tsconfig FE/BE | grep-чеклист + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0f | Правки по итогам ревью: глобальные `RepositoriesModule`/`BoardAccessModule` (снят `forwardRef`), `bcrypt`→`bcryptjs`, Alpine+openssl+`binaryTargets`, `navigator.locks`/`BroadcastChannel` + `REFRESH_GRACE_SECONDS`, атомарный `409`, Redis-dedup SSE, retry `Column.order`, zod v3 | grep-чеклист + `git diff docs/` | —      | done   |
| 2026-09-21 | 0.0g | Синхронизация плана с архитектурой: глобальный `RepositoriesModule` (1.2) и `BoardAccessModule` (2.1), регистрация репозиториев по шагам, Redis Pub/Sub в 2.6 (+ зависимости `0.3`/`2.5`), ретрофит-зависимости 2.6/3.1, `test:e2e` в командах проверки, `db:*` перенесены в 1.2, дедуп harness 6.1 | grep-чеклист + `git diff docs/` | —      | done   |
