# ADR-004: Access + refresh токены

**Статус:** Принято  
**Дата:** 2026-09-21

## Контекст

JWT выбран в ADR-001. Нужно определить сроки жизни, хранение и отзыв токенов,
чтобы обеспечить и удобство (перезагрузка страницы), и безопасность (XSS/CSRF).

## Решение

- **Access-токен** — 15 минут, хранится **в памяти** клиента (React state), не в localStorage.
- **Refresh-токен** — 7 дней, в cookie `httpOnly; Secure; SameSite=Lax; Path=/api/auth`.
- Refresh-токены хранятся в БД (`RefreshToken.tokenHash`, bcrypt/argon не нужен — SHA-256)
  с `expiresAt` и `revokedAt`, что позволяет отзывать сессии.
- Эндпоинты: `POST /api/auth/refresh` (ротация refresh-токена), `POST /api/auth/logout`
  (отзыв + очистка cookie). Клиент объединяет параллельные refresh (single-flight) и координирует
  вкладки через `navigator.locks` + `BroadcastChannel`; сервер в окне `REFRESH_GRACE_SECONDS`
  принимает недавно отозванный токен и выдаёт новую пару.
- При старте приложение вызывает `/auth/refresh`, чтобы получить access-токен в память.

## Последствия

- XSS не даёт долговременного доступа: access-токен живёт 15 минут.
- SameSite=Lax + отправка только на `/api/auth` закрывает CSRF на refresh-роут.
- WebSocket использует access-токен в handshake; SSE — `Authorization` через `fetch-event-source`.
- Env: `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `REFRESH_GRACE_SECONDS`, `COOKIE_SECURE`.

## Альтернативы

- **Access-токен в localStorage** — rejected: доступен при XSS, нет отзыва.
- **Только access-токен, срок 7 дней** — rejected: долгий срок без возможности отзыва.
- **Session-based auth** — rejected: неудобен для API + WebSocket (см. ADR-001).
