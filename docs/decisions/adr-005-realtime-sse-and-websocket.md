# ADR-005: Socket.IO для доски + SSE для активности

**Статус:** Принято  
**Дата:** 2026-09-21

## Контекст

Нужны live-обновления доски (карточки, колонки) и поток лога активности. Исходные требования
допускали `Socket.IO`/`ws` + `SSE` для activity.

## Решение

Разделяем realtime на два канала:

- **Socket.IO** — доска: двунаправленный канал, комнаты `board:{boardId}`, fallback-транспорты.
- **SSE** — лог активности: `GET /api/boards/:id/activity/stream`, только «сервер → клиент»,
  events `activity` + `ping` (heartbeat 15 c), авторизация через `Authorization` из
  `@microsoft/fetch-event-source`.

`activity.new` по WebSocket **убран**, чтобы не дублировать поток.

## Последствия

- Меньше кода для лога: нет комнат/подписок, обычный HTTP-стрим.
- Nginx требует отдельный `location` для SSE (`proxy_buffering off`, долгий `proxy_read_timeout`).
- Redis нужен для Socket.IO adapter и для Pub/Sub-доставки activity между инстансами
  (см. [ADR-002](./adr-002-why-redis.md)).

## Альтернативы

- **Всё через Socket.IO** — возможно, но лишняя сложность для одностороннего лога.
- **Всё через SSE + Redis Pub/Sub** — rejected: SSE не умеет клиент→сервер.
- **WebSocket напрямую (`ws`)** — rejected: нет комнат и fallback из коробки.
