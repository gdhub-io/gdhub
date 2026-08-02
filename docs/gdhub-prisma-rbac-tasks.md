# Задание для `@gdhub-io/gdhub-prisma`: RBAC

### Дополнить enum `AuditAction`

```prisma
enum AuditAction {
  // … существующие значения

  ACCESS_DENIED
  ACCESS_OVERRIDE
}
```

Те же два значения — в TS-union `AuditAction` в `audit/changes.ts`. Логику
аудит-расширения менять не нужно: эти значения пишет только приложение.

Отдельной миграцией, без других изменений: `ALTER TYPE ... ADD VALUE` в ряде
версий Postgres не выполняется в одной транзакции с прочими операциями.
