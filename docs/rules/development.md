# Правила разработки

> Пошаговый процесс — в [step-rules.md](./step-rules.md).

## Ветки и коммиты

- Conventional Commits (commitlint): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Ветки: `feat/<short>`, `fix/<short>`.
- Husky + lint-staged: `pnpm lint` и `pnpm format` запускаются на pre-commit.

## Стиль

- TypeScript `strict`; без `any` в публичных сигнатурах.
- Общие типы и zod-схемы — только в `packages/shared`.
- Markdown в карточках рендерится без raw HTML (`rehype-sanitize`).

## PR

- Один PR — одна задача; зелёный CI; self-review по чеклисту из [step-rules.md](./step-rules.md).
- При изменении контрактов API или схемы БД обновлять `docs/`.

## Команды

| Команда | Что делает |
|---------|-----------|
| `pnpm dev` | FE + BE параллельно (turbo) |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm typecheck` | Проверка типов |
| `pnpm test` | Unit-тесты (Jest + Vitest) |
| `pnpm e2e` | Playwright |
| `pnpm db:migrate` / `pnpm db:seed` | Prisma-миграции / seed |
