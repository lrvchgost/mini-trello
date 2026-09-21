# ADR-006: @hello-pangea/dnd вместо dnd-kit

**Статус:** Принято  
**Дата:** 2026-09-21

## Контекст

Drag-and-drop карточек между колонками и внутри колонки (desktop + touch).

## Решение

Используем **@hello-pangea/dnd** — поддерживаемый форк `react-beautiful-dnd`.

## Последствия

- Хороший доступный DnD «из коробки» (клавиатура, screen reader).
- Touch-поддержка; на мобиле включаем long-press (300 ms), чтобы не конфликтовать со скроллом.
- Простой API `Droppable`/`Draggable` для канбана.

## Альтернативы

- **dnd-kit** — современнее и гибче (без `react-beautiful-dnd`-наследия), но требует больше ручной
  реализации сортировки/accessibility. Держим как запасной вариант.
- **react-beautiful-dnd** — rejected: не поддерживается, проблемы с React 18 StrictMode.
