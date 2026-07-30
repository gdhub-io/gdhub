# Roles & Permissions

> Дизайн системы доступов для spaces. **Реализация — отдельной задачей**, здесь
> только договорённости.
>
> Главное требование: **универсальность**. Спейсов со временем станет больше,
> поэтому добавление нового не должно трогать гейты, API-враппер, провайдер и UI.
> Новый спейс = один файл-описатель + сид матрицы прав.
>
> Контекст: роуты уже приведены к `(app)/(spaces)/…`, серверные гейты вызывают
> `resolveSpaceAccess()` в `layout.tsx` — см.
> [space-access.ts](../src/helpers/space-access.ts).

## 1. Понятия

| Термин | Что это |
|---|---|
| **Space** | Область с собственным членством и навигацией. Сейчас: `hub`, `project`, `event`, `course`, `admin`, `dev`. |
| **Space kind** | Описатель типа спейса в коде: какие у него features, как достаётся сущность, что отнимает состояние. |
| **Space instance** | Конкретный экземпляр: `(spaceType, spaceId)`. У многоэкземплярных спейсов `spaceId` — id сущности (`project`, `event`, `course`), у одноэкземплярных — фиксированная строка `"default"` (`hub`, `admin`, `dev`). |
| **Space role** | Роль юзера в **конкретном экземпляре**: `owner`, `admin`, `member`, `guest`. Плюс служебное `none` — доступа нет. |
| **Feature** | Переиспользуемый функциональный блок со своим набором действий: `team`, `documents`, `content`, `schedule`, `devlog`, `certificates`, `equity`, `settings`… Один и тот же feature живёт в разных спейсах. |
| **Permission** | `{spaceType}.{feature}.{action}` — `project.team.invite`, `event.certificates.issue`. Собирается автоматически, руками не перечисляется. |

Правило разделения ответственности:

- **список features и actions** — в коде (появление нового действия — это код);
- **какие features есть у спейса** — в коде, в описателе спейса;
- **матрица «роль → права»** — в БД, настраивается в админке;
- **UI и админка оперируют ролями**, весь код — правами.

## 2. Роли

| Роль | Смысл |
|---|---|
| `owner` | Создал спейс, распоряжается полностью. Единственный, кто может удалить/архивировать |
| `admin` | Управляет спейсом, но не владеет им. Платформенный админ (см. инвариант 5) получает `admin` **в любом** спейсе |
| `member` | Вступил: нанят в команду, одобрен на эвент, зачислен на курс, прошёл онбординг в хабе |
| `guest` | Авторизован, но не вступил. Read-only |
| `none` | Не имеет отношения к спейсу → `notFound()` |

Инварианты:

1. **Одна роль на пару (user, space).** Если подходит несколько источников —
   максимум по старшинству `owner > admin > member > guest > none`.
2. **`none` отдаёт 404, а не 403** — чтобы не подтверждать существование чужой
   сущности. Так работает и сейчас.
3. `guest` ≠ `none`: гость видит спейс в режиме чтения. Пока реально
   используется только в хабе, но механика общая — в любом спейсе можно
   пригласить наблюдателем (`role = guest`).
4. Набор ролей фиксирован. Если когда-нибудь понадобятся кастомные роли внутри
   спейса — это отдельная таблица `SpaceCustomRole`, не расширение этих четырёх.
5. **Роль в хабе — она же платформенная роль.** `hub.admin` — сотрудник
   платформы: получает `admin` в любом другом спейсе и доступ к спейсу `admin`.
   `hub.owner` — владелец хаба; сейчас необязателен, обретает смысл, когда хабов
   станет несколько (§4). Отдельного флага «платформенный админ» нет — это
   обычное членство, настраиваемое как любое другое.
6. **Супер-админ — не роль, а флаг `User.isSuperAdmin`** (см. §2.1).

### 2.1 Супер-админ

Матрица прав редактируется из админки, а значит её можно испортить: снятая
галочка на `admin.*` для роли `admin` запирает снаружи всех, и вернуться можно
только через SQL. Поэтому нужен один identity, который матрицу **не читает**:

```prisma
model User {
  // …
  /// Break-glass доступ. Ставится только вручную в БД / сидом.
  isSuperAdmin Boolean @default(false)
}
```

Правила:

- `can()` для супер-админа возвращает `true` всегда — минуя матрицу, состояние
  сущности (§7) и членство. Он может разархивировать проект и войти в любой
  спейс.
- Флаг **не выставляется ни через API, ни через админку** — ни одна Zod-схема
  его не принимает, в UI переключателя нет. Только SQL или сид.
- Каждое действие, прошедшее по байпасу, пишется в audit-log отдельным типом
  `superadmin_override` — иначе байпас невидим в истории.
- В продуктовой логике флаг **не используется** (`if (isSuperAdmin) show …`
  запрещено), иначе проверки доступа снова расползутся по коду. Единственная
  точка чтения — `can()`.
- Флаг едет в сессии (JWT), поэтому его снятие требует инвалидации сессии
  пользователя.

Супер-админ не заменяет стафф: маркетолог, HR и модератор — это `hub.admin` и,
позже, кастомные роли в спейсе `admin` (§5.5), а не второй `isSuperAdmin`.

### Жизненный цикл юзера

```
регистрация               → hub: guest    (SpaceMember(hub, default, guest))
онбординг пройден         → hub: member   (роль повышается до member)
создал проект/курс/эвент  → этот space: owner
принял приглашение        → этот space: member (или guest, если позвали наблюдателем)
hub: admin                → admin во всех spaces + доступ к space `admin`
hub: owner                → владелец хаба (при нескольких хабах — своего)
User.isSuperAdmin = true  → байпас всех проверок, ставится вручную в БД
NODE_ENV !== production   → доступ к space `dev`
```

Спейс `dev` — единственный, чей доступ зависит не только от данных: сначала
проверяется окружение (в production → `none`), и лишь затем роль.

## 3. Features — то, из чего собираются права

Ключ к универсальности: спейсы разные, но их начинка повторяется. Feature
объявляется один раз вместе с действиями и **дефолтом по ролям**, а спейс просто
перечисляет свои features.

```ts
// src/config/permissions/features.ts
export const FEATURES = {
  // управление спейсом
  settings:     { actions: ["view", "edit"] },
  members:      { actions: ["view", "invite", "remove"] },   // team в проекте, участники в эвенте
  lifecycle:    { actions: ["publish", "archive", "delete"] },
  moderation:   { actions: ["review"] },
  // наполнение
  content:      { actions: ["view", "edit"] },
  schedule:     { actions: ["view", "edit"] },
  documents:    { actions: ["view", "manage"] },
  devlog:       { actions: ["view", "create", "publish"] },
  workflow:     { actions: ["view", "edit"] },
  curriculum:   { actions: ["view", "edit"] },
  classroom:    { actions: ["access", "teach"] },
  equity:       { actions: ["view", "manage"] },
  certificates: { actions: ["view", "issue"] },
  // витрины и обмен — сейчас живут в хабе, но переиспользуемы
  // (комьюнити-хаб, спейс студии и т.п.)
  talent_pool:  { actions: ["view", "contact"] },
  projects:     { actions: ["view", "create"] },
  events:       { actions: ["view", "create"] },
  courses:      { actions: ["view", "create"] },
  jobs:         { actions: ["view", "apply", "manage"] },
  experts:      { actions: ["view", "request"] },
  chat:         { actions: ["use"] },
  live_reports: { actions: ["view"] },
  // администрирование платформы (features спейса admin)
  users:        { actions: ["view", "manage"] },
  posts:        { actions: ["view", "manage"] },
  devlog_posts: { actions: ["view", "manage"] },
  audit_logs:   { actions: ["view"] },
} as const;
```

Хаб — не «маленький» спейс: у него features больше, чем у проекта, и все четыре
роли работают. Одноэкземплярность (см. §4) на это никак не влияет.

Дефолт прав задаётся **по типу действия**, а не перечислением каждой строки:

| Класс действия | owner | admin | member | guest |
|---|---|---|---|---|
| `view`, `access`, `create`, `use`, `apply`, `request`, `contact` | ✅ | ✅ | ✅ | — |
| `edit`, `manage`, `invite`, `remove`, `publish`, `issue`, `teach`, `review` | ✅ | ✅ | — | — |
| `archive`, `delete` | ✅ | — | — | — |

Спейс переопределяет только исключения — их немного:

- `project.devlog.view`, `project.view`, `event.view`, `event.schedule.view`,
  `course.view` — открыты гостю;
- `project.equity.view` для `member` — только свои доли (`own`-скоуп, см. §7);
- в хабе гость получает только витрины (`hub.projects.view`,
  `hub.events.view`, `hub.courses.view`, `hub.jobs.view`, `hub.experts.view`);
  `talent_pool`, `*.create`, `jobs.apply`, `chat.use`, `experts.request`
  остаются за онбордингом.

Итого «матрица на 120 галочек» не пишется руками: она **генерируется** из
features спейса и дефолтов, затем правится в админке.

## 4. Реестр спейсов

Вместо `switch (type)` в резолвере — набор описателей. Всё, что знает система о
спейсе, лежит в одном файле.

```ts
// src/config/spaces/project.ts — многоэкземплярный спейс
export const projectSpace = defineSpace({
  type: "project",
  /** Откуда берётся spaceId: из параметра роута / тела запроса. */
  instanceFrom: { param: "slug" },
  loadEntity: (idOrSlug) =>
    prisma.project.findFirst({ where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }] } }),
  features: ["settings", "workflow", "members", "documents", "equity", "devlog", "lifecycle"],
  overrides: {
    guest: ["project.view", "project.devlog.view"],
    member: { "project.equity.view": "own" },
  },
  /** Состояние сущности может ТОЛЬКО отнимать права. */
  constraints: (project) =>
    project.status === ProjectStatus.Archived ? ["*.edit", "*.manage", "*.create"] : [],
  /** Только на время миграции: роль из доменных таблиц. Уходит после бэкфилла. */
  legacyRole: resolveProjectRoleFromTeam,
});
```

```ts
// src/config/spaces/hub.ts — одноэкземплярный: тот же описатель, фиксированный id
export const hubSpace = defineSpace({
  type: "hub",
  instanceFrom: { fixed: "default" },
  features: [
    "talent_pool", "projects", "events", "courses", "jobs", "experts",
    "experts", "chat", "live_reports", "moderation",
  ],
  overrides: {
    // гость видит витрины, но не людей и ничего не создаёт
    guest: ["hub.projects.view", "hub.events.view", "hub.courses.view", "hub.jobs.view", "hub.experts.view"],
  },
  legacyRole: ({ user }) => (user.onboardingDone ? "member" : "guest"),
});
```

```ts
// src/config/spaces/admin.ts — роль наследуется от хаба
export const adminSpace = defineSpace({
  type: "admin",
  instanceFrom: { fixed: "default" },
  features: ["users", "posts", "devlog_posts", "workflows", "audit_logs"],
  /**
   * Своего членства пока нет: спейсом управляет платформенный стафф из хаба.
   * Явные строки SpaceMember(admin, …) начнут переопределять это правило,
   * когда появятся узкие роли (маркетолог, HR) — см. §5.5.
   */
  inheritRoleFrom: { space: "hub", atLeast: "admin" },
});
```

```ts
// src/config/spaces/index.ts
export const SPACES = registerSpaces([
  hubSpace, projectSpace, eventSpace, courseSpace, adminSpace, devSpace,
]);
```

`inheritRoleFrom` — общий механизм, а не хак для админки: он же понадобится, если
у проекта появятся под-спейсы (например, отдельный спейс релиза или инвесторская
комната), которые должны наследовать роль родителя.

Обрати внимание: **одноэкземплярность — это не особый вид спейса**, а всего лишь
`instanceFrom: { fixed: "default" }`. Хаб при этом полноценный спейс: у него
больше features, чем у проекта, и все четыре роли. Ветвления
`singleton` / `entity` в коде нет — есть только «откуда взять `spaceId`».

Что это даёт: гейты, `withSpaceGuard`, провайдер доступа, админка матрицы и сид
работают через `SPACES[type]` и **не знают** про конкретные спейсы. Добавление
спейса не меняет ни одну из этих точек.

### Если хабов станет несколько

Сценарии реальные: хабы по языкам/регионам, комьюнити-хаб под конкретную студию,
white-label. Переход — только данные и один описатель:
`instanceFrom: { fixed: "default" }` → `{ param: "hubSlug" }` плюс `loadEntity`,
строки `SpaceMember` с `spaceId = "default"` размечаются по нужному хабу. Слой
доступа, матрица прав и UI не меняются. Именно поэтому `spaceId` есть всегда,
даже когда экземпляр один.

## 5. Модель данных

### 5.1 Членство — одна таблица с самого начала

С ростом числа спейсов вывод роли из доменных таблиц не масштабируется: каждый
новый спейс требовал бы своего адаптера. Поэтому членство хранится единообразно,
а доменные таблицы остаются для доменных данных (специальность, доли, оплаты).

```prisma
/// Членство в любом спейсе. spaceType — слаг из реестра в коде, не enum:
/// добавление спейса не должно требовать миграции внешнего пакета.
model SpaceMember {
  id          String    @id @default(cuid())
  spaceType   String
  spaceId     String    // id сущности; "default" у одноэкземплярных спейсов
  userId      String
  role        SpaceRole
  invitedById String?
  invitedAt   DateTime?
  joinedAt    DateTime?
  revokedAt   DateTime?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([spaceType, spaceId, userId])
  @@index([userId])
  @@index([spaceType, spaceId])
}

/// Приглашения в любой спейс — обобщение TeamInvitation.
model SpaceInvitation {
  id          String           @id @default(cuid())
  spaceType   String
  spaceId     String
  email       String
  role        SpaceRole        @default(Member)
  status      InvitationStatus @default(Pending)
  invitedById String
  userId      String?
  expiresAt   DateTime?
  acceptedAt  DateTime?
  createdAt   DateTime         @default(now())

  @@index([spaceType, spaceId])
  @@index([email])
  @@index([status])
}

enum SpaceRole { Owner Admin Member Guest }
```

### 5.2 Матрица прав

```prisma
/// «Роль → права» по типу спейса. Сидируется из кода, правится в админке.
model SpaceRolePermission {
  id         String    @id @default(cuid())
  spaceType  String
  role       SpaceRole
  permission String    // "project.team.invite"
  allowed    Boolean   @default(true)
  scope      String?   // null | "own" — см. §7
  updatedAt  DateTime  @updatedAt

  @@unique([spaceType, role, permission])
  @@index([spaceType, role])
}
```

### 5.3 Почему `spaceId` не nullable

Соблазн описать одноэкземплярные спейсы как `spaceId String?` = `null` ломает
уникальность: в Postgres NULL'ы в уникальном индексе считаются различными, то
есть `@@unique([spaceType, spaceId, userId])` **не помешает** создать юзеру
несколько строк членства в хабе с разными ролями. Плюс каждый запрос обрастает
`spaceId: null` вместо обычного равенства. Фиксированная строка `"default"`
снимает и то, и другое, а заодно делает переход к нескольким хабам миграцией
данных, а не кода.

### 5.4 Почему `spaceType`, `permission`, `feature` — строки, а не enum'ы

Prisma-схема живёт во внешнем пакете `@gdhub-io/gdhub-prisma`. Если типы спейсов
и права — enum'ы, каждый новый спейс (и каждое новое действие) требует релиза
пакета и миграции. Строка + реестр в коде как источник истины даёт то же
удобство типов на уровне TS (`keyof typeof SPACES`), а валидация делается сидом:
права, которых нет в каталоге, помечаются как устаревшие и удаляются.
`SpaceRole` остаётся enum'ом — набор ролей стабилен.

### 5.5 Узкие роли в будущем (маркетолог, HR, модератор)

Четырёх ролей хватает, пока «управляющий спейсом» — это один класс людей. Как
только в админку понадобится пустить маркетолога (только `posts`,
`devlog_posts`) и HR (только `users`), выдавать им `admin` нельзя — это полный
доступ. Тогда добавляется именованная роль со своим набором прав:

```prisma
model SpaceCustomRole {
  id          String   @id @default(cuid())
  spaceType   String
  spaceId     String?  // null — шаблон роли для всех экземпляров типа
  key         String   // "marketer", "hr", "moderator"
  title       String
  permissions String[] // подмножество прав спейса

  @@unique([spaceType, spaceId, key])
}
```

`SpaceMember` получает необязательное `customRoleKey`; если оно заполнено, права
берутся из кастомной роли, а базовая роль остаётся для старшинства (кастомные
роли не выше `member`, чтобы не спорить с инвариантом 1). Это единственное
изменение — `can()`, гейты и UI не меняются.

Делать это заранее не нужно: пока стафф один, `hub.admin` покрывает сценарий.

### 5.6 Чего сознательно НЕ делаем

Отдельной таблицы `Space` с FK на проект/эвент/курс. Пары `(spaceType, spaceId)`
достаточно, а таблица потребовала бы хука создания в каждом домене и лишнего
join. Возвращаемся к ней, только если у спейса появятся собственные атрибуты
(название, видимость, `matrixRoomId`) — тогда она заодно решит привязку чатов,
см. [chat-system.md](chat-system.md).

## 6. Рантайм

### Сервер — единственный авторитет

```ts
// src/helpers/space-access.ts
type SpaceAccess = {
  type: SpaceType;            // keyof typeof SPACES
  id: string;                 // "default" у одноэкземплярных
  role: SpaceRole | "none";
  permissions: ReadonlySet<Permission>;
  scopes: Record<Permission, "own" | undefined>;
};

getSpaceAccess(type, id, user): Promise<SpaceAccess>;
can(access, permission): boolean;
```

Порядок внутри `getSpaceAccess` — общий для всех спейсов:

0. если `user.isSuperAdmin` — вернуть `role = owner` и все права спейса, дальше
   не идти (§2.1);
1. по `SPACES[type]` разрешить `spaceId` (`instanceFrom`) и, если объявлен
   `loadEntity`, загрузить сущность;
2. роль: `max(SpaceMember.role, legacyRole?.(), inheritRoleFrom?.(), роль в хабе
   ≥ admin → admin)`;
3. права: матрица из БД для `(type, role)`;
4. вычесть то, что запрещает `constraints(entity)`.

Шаг 2 — единственное место, где роль в хабе влияет на остальные спейсы: она
резолвится один раз на запрос и кэшируется вместе с остальным доступом.

Точки применения — все универсальные:

- **Гейт спейса.** Фабрика вместо копипасты в каждом `layout.tsx`:

  ```ts
  // src/app/(app)/(spaces)/user/project/[slug]/layout.tsx
  export default createSpaceGate("project");
  ```

- **API** — один враппер вместо самодельных `authorId === user.id`:

  ```ts
  export const PUT = pipe(
    withAuth({ mode: "user" }),
    withSpaceGuard({ permission: "project.members.invite", idFrom: "body.projectId" }),
    withValidation(Schema, "body"),
  )(async (_req, _ctx, { user, access, body }) => { … });
  ```

  Тип спейса выводится из префикса права, `idFrom` — из описателя по умолчанию.
  Он же единая точка аудит-лога (страница `admin/audit-logs` уже есть).

- **Кэш**: матрица читается один раз на процесс (in-memory + TTL ~60 c, сброс
  при записи из админки); роль резолвится один раз на запрос через React
  `cache()`.

### Клиент — только отображение

Серверный layout передаёт `SpaceAccess` в клиентский `SpaceAccessProvider` (по
образцу уже сделанного
[SpaceHeader](../src/components/layouts/SpaceHeader/index.tsx)); UI получает
`useSpaceAccess()` → `{ role, can(permission) }` и прячет/дизейблит элементы.
Навигация спейса тоже строится из прав: пункт меню показывается, если есть
`*.view` соответствующего feature — значит новый спейс получает корректное меню
без правок в `SpaceHeader`.

Любая мутация перепроверяется на сервере: клиентский `can()` косметический.

## 7. Скоупы и модификаторы состояния

**Скоуп `own`** решает случаи «видит только своё» без отдельных прав:
`project.equity.view` со `scope = "own"` для `member` означает «только свои
доли». Проверка в запросе: `can(access, p) && scopeOf(access, p) === "own"` →
добавить `where: { userId: user.id }`. Скоупов ровно два: `null` (весь спейс) и
`own`.

**Модификаторы состояния** объявляются в описателе спейса и могут **только
отнимать** права:

| Состояние | Эффект |
|---|---|
| `Project.status = Archived` | снимаются все `*.edit` / `*.manage` / `*.create` |
| `Event.status = Draft`, курс не опубликован | `guest` → `none` |
| `TeamMemberStatus = Applicant/Rejected/Fired` | `none` (не `guest`) |
| `EventMemberStatus = Pending` | `guest` |
| `CourseStudentStatus = Blocked/Expelled` | `none` |
| space `dev` в production | `none` до проверки роли |

Супер-админ (§2.1) не подчиняется этой таблице — иначе архивный проект нельзя
было бы разархивировать. Такие действия помечаются в audit-log как
`superadmin_override`.

## 8. Legacy

### Адаптеры членства (временные)

`legacyRole` в описателе — единственное место, где остаётся знание про
`TeamMember` / `EventMember` / `CourseGroupStudent`:

| Домен | Отображение в роль |
|---|---|
| `Project.authorId`, `TeamMemberStatus.Founder` | `owner` |
| `TeamMemberStatus.Hired` | `member` |
| `Event.createdById` | `owner`; `EventMemberStatus.Approved` → `member`, `Pending` → `guest` |
| `Course.createdById` | `owner`; `CourseStudentStatus.Enrolled/Finished` → `member` |
| `User.onboardingDone` | `hub`: `member`, иначе `guest` |

После бэкфилла в `SpaceMember` адаптеры удаляются, домены пишут членство через
общий сервис (`joinSpace` / `inviteToSpace` / `revokeSpaceMember`).

### Текущие `UserRole`

| Значение | Решение |
|---|---|
| `Guest`, `Member` | Оставляем — это роль в **хабе** (до/после онбординга) |
| `Admin` | Переезжает в членство: `SpaceMember(hub, "default", admin)`. Одному-двум людям дополнительно ставится `User.isSuperAdmin = true`. После бэкфилла значение убирается из enum |
| `Author` | **Устарело.** «Есть проект» выводится из `Project.authorId` / `Founder`. Перестаём писать, потом убираем из enum |
| `Mentor` | **Устарело как роль доступа.** Менторство — это `Speciality` и `EventMember.mentors`. Сейчас используется только в role-гейте `/live/room/reports` в [proxy.ts](../src/proxy.ts) — заменить на право `hub.live_reports.view` |

Удаление значений из enum — последним шагом, когда в коде не осталось проверок
(миграция во внешнем пакете).

## 9. Порядок внедрения

1. **Каталог + реестр.** `FEATURES`, дефолты по классам действий, `defineSpace`
   и описатели шести текущих спейсов. `SpaceRolePermission` + сид,
   сгенерированный из реестра.
2. **`getSpaceAccess` / `can` / `createSpaceGate`** с ролями из `legacyRole`;
   `hub` и `guest` добавляются к текущим `SpaceType` / `SpaceRole`. Сюда же
   `User.isSuperAdmin` — байпас нужен раньше админки матрицы, иначе первую же
   неудачную правку прав будет нечем откатить.
3. **`withSpaceGuard`** и перевод API — по одному спейсу, начиная с `project`
   (там больше всего самодельных проверок), затем `event`, `course`, `admin`.
4. **`SpaceAccessProvider` + `useSpaceAccess()`**; замена клиентских
   `isProjectAuthor` / `hasRole(...)` на `can(...)` (сейчас таких файлов 14);
   меню спейса строится из прав.
5. **Админка матрицы**: сетка `spaceType × role × permission` с чекбоксами и
   записью в audit-log.
6. **`SpaceMember` + `SpaceInvitation`**, бэкфилл из доменных таблиц (включая
   `UserRole.Admin` → `SpaceMember(hub, "default", admin)` и `onboardingDone` →
   `member`), единый сервис членства, удаление `legacyRole`.
7. **Чистка**: `hub.live_reports.view` вместо role-гейта в `proxy.ts`, удаление
   `Author` / `Mentor` / `Admin` из `UserRole`.

Шаги 1–4 уже дают рабочую систему: права настраиваются в БД, проверки в одном
месте, UI перестаёт решать вопросы доступа.

## 10. Чек-лист «добавить новый space»

Проверка универсальности — этого списка должно быть достаточно:

1. Создать `src/config/spaces/<name>.ts` с `defineSpace({ type, instanceFrom, features, overrides?, constraints?, loadEntity?, inheritRoleFrom? })`.
2. Добавить его в `registerSpaces([...])`.
3. Прогнать сид матрицы — новые строки `SpaceRolePermission` появятся из features и дефолтов, при необходимости поправить галочки в админке.
4. Роуты: `src/app/(app)/(spaces)/<name>/…` + `layout.tsx` в одну строку — `export default createSpaceGate("<name>")`.
5. При создании сущности вызвать `joinSpace({ type, id, userId, role: "owner" })`.

Ничего из перечисленного не требует правок в `getSpaceAccess`, `withSpaceGuard`,
`SpaceAccessProvider`, `SpaceHeader` и в админке матрицы. Если новый спейс
приносит принципиально новую функциональность — добавляется **feature** в
каталог (это код), и он сразу доступен остальным спейсам.
