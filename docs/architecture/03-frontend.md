# 03 — Frontend

## Назначение

Описывает модульную структуру, экраны, флоу и data flow клиентской части.

---

## 1. Модульная структура (Feature-First)

```
apps/frontend/src/
├── app/
│   ├── App.tsx                    # Корневой компонент
│   ├── providers.tsx              # QueryClient, Router, Theme
│   └── routes.tsx                 # Маршруты
├── pages/               # Цельные страницы
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── board/
│   ├── search/
│   └── profile/
├── widgets/             # Самодостаточные блоки
│   ├── board-column/
│   ├── card-modal/
│   ├── activity-log/
│   ├── search-bar/
│   └── stats-chart/
├── features/            # Бизнес-фичи
│   ├── auth/            # login form, register form, useAuth
│   ├── boards/          # board list, board create, board settings
│   ├── cards/           # card create, card edit, card move, card filters
│   ├── comments/        # comment list, comment create
│   └── filters/         # filter bar, filter store
├── entities/            # Модели и типы
│   ├── user/
│   ├── board/
│   ├── column/
│   ├── card/
│   ├── label/
│   ├── comment/
│   └── activity/
├── shared/              # Переиспользуемое
│   ├── api/             # ky-клиент, типы ответов
│   ├── ui/              # переэкспорт shadcn/ui
│   ├── hooks/           # useDebounce, useMediaQuery
│   ├── lib/             # date-fns, cn()
│   └── config/          # env (из packages/shared)
└── styles/
    └── globals.css
```

---

## 2. Экраны и флоу

```
[Login] → [Dashboard] → [Board]
                  ↑          │
                  └──────────┘
```

| Экран | Роут | Описание |
|-------|------|----------|
| Login | `/login` | Форма входа |
| Register | `/register` | Форма регистрации |
| Dashboard | `/dashboard` | Список досок + графики статистики |
| Board | `/boards/:id` | Канбан-доска (колонки, карточки) |
| Card (modal) | `/boards/:id/cards/:cardId` | Модалка карточки (описание, комменты, активность) |
| Profile | `/profile` | Профиль: имя, смена пароля (аватары не поддерживаются) |
| Search | `/search` | Глобальный поиск по карточкам |

---

## 3. Компонентная архитектура

```
BoardPage
├── BoardHeader (название, фильтры, поиск)
├── FilterBar (priority, labels, assignee, deadline)
├── ColumnList
│   ├── Column (title, add card)
│   │   ├── Card (@hello-pangea/dnd Draggable)
│   │   └── Card (@hello-pangea/dnd Draggable)
│   └── Column ...
└── ActivityLog (виджет справа/снизу)
```

---

## 4. Data flow

```
Компонент → React Query (useQuery/useMutation)
  → ky HTTP-клиент
    → REST API (backend)
  ← React Query кэширует + ревалидирует

Socket.IO (live):
SocketContext → useSocket() → on("card.moved", ...)
  → React Query.invalidateQueries()
```

Dependency Inversion на фронте (см. [01-overview.md](./01-overview.md)):

```ts
// features/cards/api/card.repository.ts (интерфейс)
export interface ICardRepository {
  getById(id: string): Promise<Card>;
  move(cardId: string, columnId: string, order: number): Promise<void>;
}

// features/cards/api/http-card.repository.ts (имплементация)
export class HttpCardRepository implements ICardRepository {
  constructor(private readonly api: KyInstance) {}
  async move(cardId, columnId, order) {
    return this.api.patch(`cards/${cardId}/move`, { json: { columnId, order } }).json();
  }
}
```

### Optimistic updates

Мутации применяются оптимистично через React Query `onMutate`:
отмена активных запросов → snapshot → `setQueryData` → rollback в `onError`
→ `invalidateQueries` в `onSettled`.

### Live-события и дедупликация

- Socket.IO события (`card.*`, `board.updated`) → `invalidateQueries` по доске.
- Свои изменения игнорируем по `clientId` (стабильный id вкладки), а не по `actorId`: иначе
  вторая вкладка того же пользователя не получит обновление. `actorId` остаётся в payload
  для аудита, но дедуп идёт по `clientId`.
- ky-клиент добавляет заголовок `X-Client-Id` (стабильный id вкладки) ко всем мутирующим
  запросам — по нему сервер помечает событие `clientId`.
- Активность приходит отдельным потоком SSE `GET /api/boards/:id/activity/stream`
  через `@microsoft/fetch-event-source` (умеет слать `Authorization: Bearer`, в отличие от `EventSource`).

### Обновление токена

- ky-интерцептор держит **один общий `refreshPromise`**: параллельные `401` ждут один и тот же
  `POST /auth/refresh` (single-flight) и повторяют исходный запрос с новым access-токеном.
- **Между вкладками** refresh координируется `navigator.locks` (`'auth-refresh'`): одна вкладка
  делает запрос, остальные ждут результат через `BroadcastChannel` и не ротируют токен конкурентно.
- **Долгие соединения** переживают истечение access-токена (15 мин):
  - SSE: на `onerror` или при приближении `exp` — refresh и reconnect `fetch-event-source` с новым `Authorization`;
  - Socket.IO: на `connect_error` с auth-кодом — refresh, `socket.auth = { token }` и reconnect.
- Сервер дополнительно принимает refresh-токен, отозванный менее `REFRESH_GRACE_SECONDS` назад,
  и выдаёт новую пару (защита, если координация между вкладками не сработала).

### Конфликты

Стратегия — last-write-wins с оптимистичной блокировкой для текстовых полей:
`PATCH` шлёт `expectedUpdatedAt`, при расхождении сервер отвечает `409 Conflict`,
UI показывает уведомление и подтягивает свежие данные. Перемещения всегда пересчитываются сервером.

### Markdown и XSS

`Card.description` хранится как Markdown. Рендер — `react-markdown` **без `rehype-raw`**
(HTML не исполняется) + `rehype-sanitize` как дополнительный слой. MDXEditor не допускает raw HTML.

---

## 5. Адаптивность

Breakpoints (Tailwind): `sm 640`, `md 768`, `lg 1024`, `xl 1280`.

| Зона | Desktop (≥ lg) | Mobile (< md) |
|------|----------------|---------------|
| Канбан | Колонки в ряд, скролл по X | Вертикальный список / переключатель колонок (tabs) |
| Карточка | Модалка по центру | Полноэкранный sheet |
| FilterBar | Строка под хедером | Bottom-sheet |
| ActivityLog | Панель справа | Отдельная вкладка |

**DnD на тач:** `@hello-pangea/dnd` поддерживает touch — включаем long-press (300 ms) через
`dragHandleProps`, чтобы не конфликтовать со скроллом. Колонки на мобиле переключаются табами,
а не горизонтальным DnD.

**Графики:** Recharts `ResponsiveContainer` — занимает ширину контейнера.

---

## Ссылки

- API-контракты: [06-api.md](./06-api.md)
- Тестирование: [08-testing.md](./08-testing.md)
- Shared-пакет с типами: [02-monorepo.md](./02-monorepo.md)
