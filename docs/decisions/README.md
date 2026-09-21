# Architecture Decision Records

| # | Решение | Статус |
|---|---------|--------|
| 001 | [JWT вместо Keycloak](./adr-001-why-jwt-not-keycloak.md) | ✅ Принято |
| 002 | [Redis (Socket.IO adapter + activity Pub/Sub)](./adr-002-why-redis.md) | ✅ Принято |
| 003 | [MDXEditor вместо rich-markdown-editor](./adr-003-markdown-editor.md) | ✅ Принято |
| 004 | [Access + refresh токены](./adr-004-auth-tokens.md) | ✅ Принято |
| 005 | [Socket.IO + SSE](./adr-005-realtime-sse-and-websocket.md) | ✅ Принято |
| 006 | [@hello-pangea/dnd вместо dnd-kit](./adr-006-dnd-library.md) | ✅ Принято |
| 007 | [Recharts для графиков](./adr-007-charts-library.md) | ✅ Принято |
| 008 | [Ownership-only доступ (assignee = владелец)](./adr-008-ownership-only-access.md) | ✅ Принято |

### Шаблон для новых ADR

```md
# ADR-NNN: Краткое название решения

**Статус:** Proposed / Accepted / Deprecated  
**Дата:** YYYY-MM-DD

## Контекст
Почему нужно принять решение?

## Решение
Что выбрали и почему.

## Последствия
Что изменится в коде, инфраструктуре, процессах.

## Альтернативы
Что рассматривали и почему rejected.
```
