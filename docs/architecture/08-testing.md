# 08 — Тестирование

## Назначение

Стратегия тестирования: что тестируем, чем, как Dependency Inversion упрощает написание тестов.

---

## 1. Виды тестов

| Тип | Инструмент | Где | Что покрываем |
|-----|-----------|-----|---------------|
| Unit | Jest | backend | Сервисы (бизнес-логика через мокнутые репозитории) |
| Unit | Vitest + @testing-library/react | frontend | Хуки, компоненты, утилиты |
| E2E | Playwright | frontend | CRUD-сценарии, drag&drop, WebSocket, фильтры |

---

## 2. Backend: Unit-тесты через DI (главный выигрыш)

Благодаря Dependency Inversion сервисы не зависят от Prisma — только от интерфейса.
Тест подставляет мок вместо реальной БД.

```ts
// cards.service.spec.ts
describe('CardsService', () => {
  let service: CardsService;
  let mockRepo: jest.Mocked<ICardRepository>;
  let mockActivityService: jest.Mocked<ActivityService>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findManyByColumn: jest.fn(),
    };
    mockActivityService = { log: jest.fn() } as any;

    service = new CardsService(mockRepo, mockActivityService);
  });

  it('should move card and log activity', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'card-1', columnId: 'col-1' } as any);

    await service.moveCard('card-1', 'col-2', 0);

    expect(mockRepo.update).toHaveBeenCalledWith('card-1', {
      columnId: 'col-2',
      order: 0,
    });
    expect(mockActivityService.log).toHaveBeenCalledWith(
      'card.moved',
      { cardId: 'card-1', targetColumnId: 'col-2' },
    );
  });

  it('should throw if card not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.moveCard('bad-id', 'col-2', 0))
      .rejects.toThrow(NotFoundException);
  });
});
```

**Что это даёт:**
- Не нужен Prisma, не нужна БД
- Тесты летают за миллисекунды
- Можно тестировать граничные случаи (null, ошибки, пустые списки) без данных в таблицах

---

## 3. Frontend: Unit-тесты

Тестируем React Query хуки с мокнутым репозиторием (тот же DI-подход).

```ts
// cards/hooks/useMoveCard.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMoveCard } from './useMoveCard';

const mockRepo: ICardRepository = {
  move: vi.fn(),
  getById: vi.fn(),
};

test('should call repository.move', async () => {
  const { result } = renderHook(() => useMoveCard(mockRepo), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    ),
  });

  result.current.mutate({ cardId: '1', columnId: 'col-2', order: 0 });

  await waitFor(() => {
    expect(mockRepo.move).toHaveBeenCalledWith('1', 'col-2', 0);
  });
});
```

---

## 4. E2E (Playwright)

Сценарии для покрытия:

```ts
test('user can create board, add column, and move card', async ({ page }) => {
  // 1. Login (через API — setup)
  // 2. Open dashboard
  // 3. Click "Create board"
  // 4. Add column "In Progress"
  // 5. Create card with title "Test task"
  // 6. Drag card to "In Progress"
  // 7. Verify card is now in correct column
});
```

**Критические сценарии:**
- Регистрация → создание доски → добавление колонки → создание карточки
- Drag-and-drop между колонками и внутри колонки
- Фильтрация по приоритету, меткам, исполнителю
- Добавление комментария к карточке
- Live-обновление: открыть 2 окна, изменить в одном — проверить во втором

---

## 5. Покрытие

| Слой | Минимальное покрытие |
|------|---------------------|
| **Backend: Services** | 100% критических сценариев (moveCard, createBoard, assignCard) |
| **Backend: Controllers** | e2e через supertest + тестовая БД |
| **Frontend: Features** | Все useQuery/useMutation хуки |
| **Frontend: UI** | Storybook + визуальные тесты (chromatic опц.) |
| **E2E** | 5 ключевых пользовательских сценариев |

---

## Ссылки

- Dependency Inversion: [01-overview.md](./01-overview.md) и [04-backend.md](./04-backend.md)
- Модули и репозитории: [04-backend.md](./04-backend.md)
- API для E2E: [06-api.md](./06-api.md)
