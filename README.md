# postgres-practice

Учебный банковский сервис на NestJS: аккаунты с JWT-аутентификацией, атомарное списание баланса в PostgreSQL и журнал транзакций в MongoDB, наполняемый асинхронно через RabbitMQ.

## Архитектура

```
HTTP клиент
   │
   ▼
AccountsModule ──► PostgreSQL (Prisma): аккаунты, балансы
BalanceModule  ──► атомарный conditional UPDATE баланса
   │
   └─ emit "transaction.created" ──► RabbitMQ ──► TransactionsModule ──► MongoDB (Mongoose)
```

- `src/modules/*` — фичевые модули (accounts, balance, transactions);
- `src/shared/*` — переиспользуемая инфраструктура: auth (подпись/проверка JWT, guard), messaging (RabbitMQ-клиент), contracts (контракты событий между модулями);
- `src/common/*` — сквозные примитивы: фильтры исключений, пайпы, декораторы, базовый класс ошибок;
- `src/config/*` — типизированная конфигурация с валидацией env-переменных на старте;
- `src/database/*` — подключения к PostgreSQL (Prisma) и MongoDB (Mongoose).

Списание баланса выполняется одним условным `UPDATE ... WHERE balance >= amount RETURNING balance` — проверка и дебет атомарны, поэтому конкурентные запросы не могут увести баланс в минус. Перевод между аккаунтами — дебет и кредит в одной транзакции; строки обновляются в детерминированном порядке (по id), чтобы встречные переводы не приводили к deadlock. События о транзакциях (`withdrawal`, `transfer_out`, `transfer_in`) публикуются fire-and-forget: сбой брокера логируется, но не откатывает операцию.

## Запуск

```bash
# 1. Инфраструктура (PostgreSQL, MongoDB, RabbitMQ)
docker compose up -d

# 2. Зависимости
yarn install

# 3. Конфигурация
cp .env.example .env   # при необходимости отредактируйте значения

# 4. Генерация Prisma-клиента и миграции
yarn prisma:generate
yarn prisma:migrate

# 5. Приложение
yarn start:dev
```

## Переменные окружения

| Переменная | Обязательная | Описание |
| --- | --- | --- |
| `PORT` | нет (3000) | Порт HTTP-сервера |
| `DATABASE_URL` | да | Строка подключения PostgreSQL |
| `MONGODB_CONNECTION_STRING` | да | Строка подключения MongoDB |
| `APP_JWT_SECRET` | да | Секрет подписи JWT |
| `APP_JWT_EXPIRES_IN` | нет (`1h`) | Время жизни токена |
| `RABBITMQ_URL` | да | Строка подключения RabbitMQ |
| `RABBITMQ_QUEUE` | да | Имя очереди событий |

Все переменные валидируются на старте (`src/config/env.validation.ts`) — приложение не поднимется с неполной конфигурацией.

## API

| Метод | Путь | Auth | Описание |
| --- | --- | --- | --- |
| `POST` | `/accounts/sign-up` | — | Регистрация, возвращает `{ token }` |
| `POST` | `/accounts/sign-in` | — | Вход по email или username, возвращает `{ token }` |
| `GET` | `/accounts/me` | Bearer | Профиль текущего аккаунта |
| `POST` | `/balance/withdraw` | Bearer | Списание `{ amount }`, возвращает `{ balance }` |
| `POST` | `/balance/transfer` | Bearer | Перевод `{ recipientUsername, amount }` на другой аккаунт, возвращает `{ balance }` отправителя |

Защищённые эндпоинты ожидают заголовок `Authorization: Bearer <token>`.

## Скрипты

```bash
yarn start:dev    # запуск с hot-reload
yarn build        # сборка
yarn lint         # eslint (lint:fix — с автофиксом)
yarn test         # юнит-тесты
yarn test:cov     # тесты с покрытием
```
