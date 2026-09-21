# Фаза 7 — Deploy

Результат фазы: всё приложение поднимается одной командой, CI/CD настроен, README воспроизводим.

---

## Шаг 7.1 — Dockerfiles + nginx + полный compose

**Цель:** production-запуск одной командой.

**Артефакты:**
- `docker/frontend.Dockerfile` (multi-stage: build → static + nginx)
- `docker/backend.Dockerfile` (multi-stage: build → runtime + entrypoint миграций)
- `docker/nginx.conf` (edge: SPA, `/api`, `/socket.io`, отдельный SSE-location)
- `docker-compose.yml` в корне (nginx, frontend, backend, db, redis; healthchecks, volumes)
- entrypoint backend: `prisma migrate deploy && prisma db seed`

**Зависимости:** 4.1, 5.x, 6.x.

**Definition of Ready:** seed и фронт собраны; миграции стабильны.

**Действия:**
1. Backend image: `node:20-alpine` + `apk add --no-cache openssl` (Prisma engine),
   `pnpm deploy`/`prisma generate` с `binaryTargets` (musl), непривилегированный пользователь,
   `HEALTHCHECK`. `bcryptjs` — без build-tools.
2. Frontend image: сборка Vite → nginx со `try_files $uri /index.html` для SPA.
3. Edge nginx: `map $http_upgrade $connection_upgrade`; SSE-location с `proxy_buffering off` и таймаутом.
4. Compose: `depends_on` c `condition: service_healthy`; значения по умолчанию заданы в
   `environment:` (чтобы `docker compose up` работал без `.env`), переопределение — через
   опциональный `.env`; тома для БД.
5. Seed в entrypoint идемпотентен — безопасен при рестарте.
6. `VITE_*` фронта передавать как **build ARG** (runtime `environment` для Vite не работает);
   либо использовать same-origin `/api` — так и ходим через edge nginx.

**Тесты:** smoke — чистый клон → `docker compose up` → health → логин.

**Команда проверки:**
```bash
docker compose up -d --build      # единственная команда запуска
curl -s localhost/api/health
curl -s -o /dev/null -w "%{http_code}" localhost/        # 200 (SPA)
curl -s -o /dev/null -w "%{http_code}" localhost/boards/x  # 200 (SPA deep-link)
```

**Ожидаемый результат (DoD):**
- Одна команда `docker compose up` (из корня, без `-f`) поднимает весь стек; первый запуск
  сам собирает образы, применяет миграции и идемпотентно засеивает данные.
- Все сервисы `healthy`; `/api/health` OK; SPA deep-link не 404; WS/SSE доступны через edge.

**Откат:** `docker compose down`; исправления — новым билдом (forward-fix).
**Продолжение после паузы:** `docker compose ps` + `curl /api/health`.
**Оценка:** 1.5 дня.
**Commit:** `chore(deploy): dockerfiles, nginx and full compose stack`

---

## Шаг 7.2 — CI/CD

**Цель:** автоматические проверки и деплой.

**Артефакты:** `.github/workflows/ci.yml` (quality + e2e + build образов), `.github/workflows/deploy.yml`.

**Зависимости:** 6.1–6.3, 7.1.

**DoR:** все тесты локально проходят; compose собирается.

**Действия:**
1. CI: `pnpm install --frozen-lockfile`, `lint`, `format:check`, `typecheck`, `test`, `build`;
   job `e2e` с сервисами Postgres и Redis (`migrate deploy` + seed + backend `test:e2e` + Playwright);
   job сборки Docker-образов.
2. CD: на `main`/тег — сборка и push в GHCR; деплой `docker compose pull && up -d`.
3. Секреты (`DATABASE_URL`, `JWT_SECRET`, `SSH_*`) — GitHub Secrets.
4. Кэш pnpm и Playwright browsers.

**Команда проверки:** открыть PR со сломанным тестом → CI красный; исправить → зелёный.

**Ожидаемый результат (DoD):** merge без зелёного CI невозможен; deploy-job проходит на тестовом окружении.

**Откат:** отключить workflow; вернуть предыдущий коммит.
**Продолжение после паузы:** `git push` и проверить Actions.
**Оценка:** 1 день.
**Commit:** `ci: quality, e2e and docker build pipelines with deploy`

---

## Шаг 7.3 — Runbook (README)

**Цель:** новый человек запускает проект строго по инструкции.

**Артефакты:** `README.md` в корне репозитория — **обязательный markdown-документ**
с инструкцией по запуску (формат `.md`, не wiki/PDF).

**Зависимости:** 7.1.

**DoR:** compose-стек работает.

**Действия:**
1. Разделы (каждый — с командами): «Требования», «Быстрый старт (одна команда `docker compose up`)»,
   «Локальная разработка», «Тесты», «Демо-доступы», «Переменные окружения», «Структура проекта».
2. Демо-доступы: `alice@example.com` / `bob@example.com`, `password123`.
3. Команды копипастой; никаких «см. код»; markdown-заголовки и code-fences для всех команд.

**Команда проверки:** пошагово по README на чистой машине/в чистом каталоге.

**Ожидаемый результат (DoD):** инструкция воспроизводится без правок; приложение доступно и залогинено.

**Откат:** revert.
**Продолжение после паузы:** перечитать README и воспроизвести.
**Оценка:** 0.5 дня.
**Commit:** `docs: runbook for local and docker setup`
