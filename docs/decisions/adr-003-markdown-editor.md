# ADR-003: MDXEditor вместо rich-markdown-editor

**Статус:** Принято  
**Дата:** 2026-09-21

## Контекст

Для описания карточек нужен Markdown-редактор на React 18. Изначально был указан
`rich-markdown-editor`.

## Решение

Редактирование — **MDXEditor**, рендер — `react-markdown` + `remark-gfm`.

## Последствия

- Редактор активно поддерживается и совместим с React 18/19.
- Markdown остаётся нативным форматом хранения (`Card.description` — строка).
- Для безопасного рендера ограничиваем набор элементов (без raw HTML) либо подключаем `rehype-sanitize`.

## Альтернативы

- **rich-markdown-editor** — rejected: не поддерживается, проблемы совместимости с React 18.
- **TipTap** — возможно: мощнее, но markdown требует `tiptap-markdown` и больше настройки.
- **textarea + preview** — rejected: плохой UX.
