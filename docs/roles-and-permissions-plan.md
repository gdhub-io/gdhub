# RBAC: план реализации

> Рабочий план по [roles-and-permissions.md](roles-and-permissions.md). Дизайн там,
> здесь — порядок работ, задачи для пакета `@gdhub-io/gdhub-prisma`, тесты и
> миграция существующих пользователей.
>
> Отличие от дизайн-документа: **кастомные роли (`SpaceCustomRole`) входят в
> объём сразу** — в админке нужна страница создания ролей, поэтому §5.6 дизайна
> из «когда-нибудь потом» переезжает в фазу 6.

## Что уже есть

| | Состояние |
|---|---|
| Роуты `(app)/(spaces)/…` | сделано |
| Гейты спейсов в `layout.tsx` для project / event / course / admin / dev | сделано, [space-gate.tsx](../src/lib/space-gate.tsx) |
| Тесты резолвера | 17 кейсов, [tests/space-access.test.ts](../tests/space-access.test.ts) |
| `AuditLog` в схеме | есть, универсальный (`entity`, `entityId`, `action`, `changes`, `meta`) — новых таблиц под аудит не нужно |
| Самодельные проверки доступа | 14 файлов UI (`isProjectAuthor`, `hasRole`), 4 сравнения `authorId === user.id` в API |

## Задачи для `@gdhub-io/gdhub-prisma`

Всего два захода в пакет. **P1 блокирует фазу 2**, поэтому его лучше начать
сразу, параллельно с фазой 1 — она от схемы не зависит.

### P1 — модели RBAC (нужен к фазе 2)

```prisma
enum SpaceRole { Owner Admin Member Guest }

/// Матрица «роль → права» по типу спейса. Сидируется из кода, правится в админке.
model SpaceRolePermission {
  id         String    @id @default(cuid())
  spaceType  String
  role       SpaceRole
  permission String
  allowed    Boolean   @default(true)
  scope      String?   // null | "own"
  updatedAt  DateTime  @updatedAt

  @@unique([spaceType, role, permission])
  @@index([spaceType, role])
}

/// Именованная роль с собственным набором прав: маркетолог, HR, модератор.
model SpaceCustomRole {
  id          String   @id @default(cuid())
  spaceType   String
  spaceId     String?  // null — шаблон для всех экземпляров типа
  key         String   // "marketer", "hr"
  title       String
  permissions String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([spaceType, spaceId, key])
}

model SpaceMember {
  id            String    @id @default(cuid())
  spaceType     String
  spaceId       String    // id сущности; "default" у hub/admin/dev
  userId        String
  role          SpaceRole
  customRoleKey String?   // если задан — права берутся из SpaceCustomRole
  invitedById   String?
  invitedAt     DateTime?
  joinedAt      DateTime?
  revokedAt     DateTime?
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([spaceType, spaceId, userId])
  @@index([userId])
  @@index([spaceType, spaceId])
}

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

model User {
  // …
  /// Break-glass доступ. Ставится только вручную в БД / сидом, не через API.
  isSuperAdmin Boolean @default(false)
}
```

Проверить при ревью:

- `spaceId` **не nullable** — в Postgres NULL'ы в уникальном индексе различны, и
  `@@unique([spaceType, spaceId, userId])` не сработал бы для хаба;
- `spaceType` и `permission` — **строки, не enum'ы**: иначе каждый новый спейс и
  каждое новое действие требуют релиза пакета;
- `SpaceMember.user` с `onDelete: Cascade` — членство удалённого юзера уходит
  само. На домен (проект / эвент) FK нет, он был бы полиморфным, — за это
  отвечает `deleteSpaceMembership` в приложении.

Отдельного сида в пакете не нужно: матрицу заполняет идемпотентный скрипт из
app (фаза 2), потому что источник истины — реестр спейсов в коде.

### P2 — чистка legacy + аудит доступа (в самом конце, после фазы 7)

Добавить в `enum AuditAction` значения `ACCESS_DENIED` и `ACCESS_OVERRIDE` —
без них отказ в доступе и байпас супер-админа некуда записать: остальные значения
описывают изменение данных, а отказ ничего не меняет. После этого
`src/services/access/audit.ts` переключается с лога на `AuditLog` одной правкой.

Убрать из `enum UserRole` значения `Author`, `Mentor`, `Admin`. Делать **только**
после того, как в app не осталось ни одной проверки по ним и бэкфилл прошёл на
проде. `Guest` и `Member` остаются — это роль в хабе.

## Статус

| Фаза | Состояние |
|---|---|
| Ф1 — каталог и реестр | **сделано** |
| P1 — модели в пакете | **готово**, `@gdhub-io/gdhub-prisma@2.0.0-beta.40` |
| Ф2 — резолвер и гейты | **сделано**, включая сид и источник из БД |
| Ф3 — API | **сделано**: 49 файлов под гейтом; в API не осталось ни одной проверки по `UserRole` |
| Ф4 — клиент | **сделано** |
| Ф5 — членство и бэкфилл | **сделано**, бэкфилл в проде ещё не запускался |
| P1.1 — `ACCESS_DENIED` / `ACCESS_OVERRIDE` | **готово**, `2.0.0-beta.41` |
| Ф6 — админка | **сделано**: `/admin/roles`, роли пользователя на `/admin/users`, кастомные роли |
| Ф7 — чистка | **проверки доступа по `UserRole` убраны**; остаток — роли как данные профиля, нужно решение до P2 |

## Бэклог (не блокирует RBAC)

- 6 роутов `api/cron/*` без гейта — отдельная задача, не RBAC-каталог.
- Убрать `resolveRole` из адаптеров — **только после** прогона бэкфилла в проде.
- E2E на матрицу («снял галочку — право пропало») — нужна докерная БД.
- Вынести лекции целиком — см. следующий раздел.

## Убрать лекции целиком

Отдельных лекций не будет: занятия живут внутри курсов, разовые выступления —
это события. В фазе 6 из каталога ушла фича `admin.lectures` и вместе с ней
`api/admin/lecture/**`; остальное ждёт своей задачи.

Весь UI лекций **уже мёртвый** — ни один экран не импортирует ни компоненты, ни
модалки, они остались висеть после какого-то прошлого редизайна. То есть
удаление кода ничего не ломает; работа не в нём, а в данных.

**1. Код приложения** (удаляется как есть):

- `src/components/lectures/` — `HeldLectures`, `ReadyLectures`, `RequestedLectures`;
- `src/components/modals/LectureDetailsModal/`, `LectureRequestModal/`,
  `PropositionLectureModal/`, `SetLecturerModal/`;
- `src/app/api/user/lecture/**` — 6 роутов: `route.ts`, `listener/`,
  `[id]/show/`, `[id]/registration/`, `[id]/lecturer/`, `[id]/lecturer/[requestId]/`;
- `LectureStage` в [prisma-enums.ts](../src/config/prisma-enums.ts) — убирать
  вместе с enum в пакете, иначе `satisfies` перестанет компилироваться;
- строки про лекции в `SpecialitiesProfileForm` и `ExportDataModal` — заменить на
  курсы и события.

**2. Данные — сначала, до схемы.** Решить, что делать с существующими
`Lecture` / `LecturerRequest` / `LectureListener`: перенести в `Event` (у лекции
есть `directionId`, `stage`, слушатели и заявки лекторов — это почти событие) или
выгрузить и удалить. Пока не решено, схему трогать нельзя.

**3. Пакет `@gdhub-io/gdhub-prisma`** (после миграции данных):

- удалить модели `Lecture`, `LecturerRequest`, `LectureListener` и enum
  `LectureStage`;
- убрать обратные связи в `User` (`requestedLectures`, `listener`,
  `lecturerRequests`) и в `WorkDirection` (`Lecture[]`);
- проверить `user.ts`-расширение: `deleteAccount` и подсчёт связанных записей
  ходят в `lectureRequests` / `lectureListeners` / `lecturerRequests`.

## Фазы

### Фаза 1 — каталог и реестр (app, без БД) — сделано

Что получилось:

- [actions.ts](../src/config/permissions/actions.ts) — 17 действий, у каждого
  класс через `Record<Action, ActionClass>`: новое действие нельзя добавить,
  не назначив ему класс;
- [roles.ts](../src/config/permissions/roles.ts) — `strongestRole`, `roleAtLeast`;
- [defaults.ts](../src/config/permissions/defaults.ts) — read → member+,
  manage → admin+, destructive → owner;
- [define-space.ts](../src/config/spaces/define-space.ts) + шесть описателей +
  [реестр](../src/config/spaces/index.ts). Тип `Permission` выводится из реестра,
  поэтому опечатка в праве падает на компиляции;
- [matrix.ts](../src/config/permissions/matrix.ts) — 4 роли × 61 право = 244
  строки, у каждой ячейки админки будет своя запись;
- [tests/permissions-matrix.test.ts](../tests/permissions-matrix.test.ts) —
  22 кейса.

Изменение против дизайна: адаптеры регистрируются **явной картой**
(`SPACE_ADAPTERS`), а не вызовом `registerSpaceAdapter()` — импорт ради
сайд-эффекта в Next легко теряется при бандлинге, а карта тестируема и
tree-shakeable.

### Фаза 2 — резолвер и гейты — сделано (кроме частей на БД)

Готово и работает **без** таблиц RBAC — матрица берётся из реестра в коде:

- [matrix-source.ts](../src/services/access/matrix-source.ts) — источник матрицы
  с кэшем на 60 с и `setMatrixSource()`. Сейчас источник — код; когда появится
  `SpaceRolePermission`, подменяется одной строкой, остальное не меняется. Он же
  остаётся страховкой, если таблица окажется пустой;
- [access/index.ts](../src/services/access/index.ts) — `getSpaceAccess`, `can`,
  `scopeOf`, `canEnter`, флаг `RBAC_ENFORCE` (по умолчанию **включён**: забытый
  флаг должен запрещать, а не разрешать);
- адаптеры [project](../src/repositories/project.space.ts),
  [event](../src/repositories/event.space.ts),
  [course](../src/repositories/course.space.ts),
  [hub](../src/repositories/hub.space.ts) + карта
  [adapters.ts](../src/services/access/adapters.ts);
- [space-gate.tsx](../src/lib/space-gate.tsx) — `createSpaceGate`; все пять
  гейтов (project, event, course, admin, dev) теперь однострочные;
- старый `src/helpers/space-access.ts` удалён, тесты переписаны на новый
  резолвер: [tests/space-access.test.ts](../tests/space-access.test.ts), 36 кейсов.

Отличия от плана, принятые по ходу:

- адаптер отдаёт `{ spaceId, role }` **одним** запросом (`resolve`), а не двумя
  (`resolveSpaceId` + `resolveRole`): гейт срабатывает на каждой странице спейса,
  лишний round-trip там дорог;
- `dev` теперь требует роль ≥ `admin` в хабе, как в дизайне. Раньше пускал любого
  авторизованного вне production;
- адаптеры собраны явной картой, а не сайд-эффектными вызовами регистрации.

Доделано после P1 (`beta.40`):

- [matrix-db.ts](../src/services/access/matrix-db.ts) — чтение матрицы из
  `SpaceRolePermission`. Поведение при сбоях разведено по причинам:

  | Состояние | Что отдаём | Почему |
  |---|---|---|
  | `stored` | данные из БД | норма |
  | `defaults` | матрицу из кода | таблица честно пуста (сид не прогнан) — код и БД в этот момент совпадают по определению |
  | `stale` | последний успешный снимок | чтение упало. Подставить дефолты значило бы **вернуть права, которые админ отобрал** |
  | `unavailable` | ничего, всё запрещено | чтение упало и снимка нет: fail closed |

  `getMatrixHealth()` отдаёт состояние наружу (пригодится health-эндпоинту и
  баннеру в админке), переход между состояниями логируется один раз, а не на
  каждый запрос; после неудачи — бэкофф 5 с, чтобы не долбить упавшую базу;
- [matrix-sync.ts](../src/services/access/matrix-sync.ts) — чистая функция
  `planMatrixSync`, решающая что создать / обновить / оставить / удалить;
- [scripts/rbac-seed-matrix.ts](../scripts/rbac-seed-matrix.ts) +
  `bun run rbac:seed-matrix` (`--dry-run`, `--force`). Прогнан на локальной БД:
  288 строк, повторный запуск — 0 изменений;
- [tests/rbac-matrix-sync.test.ts](../tests/rbac-matrix-sync.test.ts) — 9 кейсов,
  главный: ручная правка галочки переживает следующий деплой;
- [tests/rbac-matrix-health.test.ts](../tests/rbac-matrix-health.test.ts) —
  6 кейсов на деградацию источника, главный: снятое админом право не возвращается
  во время аварии БД;
- **дублирование типов убрано**: роль в коде — это `SpaceRole` из схемы
  (через браузеро-безопасный [prisma-enums.ts](../src/config/prisma-enums.ts)),
  а не собственный union в нижнем регистре. Слой перевода `role-mapping.ts`
  удалён; `AccessUser` и `StoredRow` выведены из моделей Prisma через `Pick`,
  поэтому переименование колонки ломает сборку, а не поведение;
- `scripts/**/*.ts` включены в `tsconfig` — скрипт, который пишет в прод-базу,
  должен проверяться `bun run type-check`.

`isSuperAdmin` правок не потребовал: JWT-колбэк спредит всю запись юзера, поэтому
флаг доезжает до сессии сам (обновится в течение интервала синка токена).

### Фаза 2 — исходный план

- `scripts/rbac-seed-matrix.ts` — заливает матрицу в `SpaceRolePermission`.
  Идемпотентный: добавляет новые права, снимает исчезнувшие, **не трогает**
  вручную изменённые галочки (сверяется по `updatedAt`).
- `getSpaceAccess(type, id, user)` и `can(access, permission)` в
  [src/services/access](../src/services/access/index.ts).
- Адаптеры спейсов (`registerSpaceAdapter`) с `resolveRole` из доменных таблиц —
  временные, уйдут в фазе 5.
- `createSpaceGate(type, { param })` — замена скопированных гейтов в четырёх
  `layout.tsx`.
- `isSuperAdmin` в сессии (NextAuth callback) + байпас в `can()`.

**Тесты (критично):**
расширяем `tests/space-access.test.ts` — матрица кейсов «спейс × роль × право»,
приоритет ролей (`owner > admin > member > guest > none`), `own`-скоуп, байпас
супер-админа, `revoked` у архивного проекта. Плюс интеграционный тест сида на
докерной БД по образцу `docker-prisma.integration.test.ts`.

**Флаг выката.** `RBAC_ENFORCE` (env): при `false` `can()` возвращает `true`, но
пишет в лог отказ, который случился бы. Неделя в таком режиме на проде — и видно,
не запирает ли матрица живых пользователей. Флаг снимается в конце фазы 3.

### Фаза 3 — API — в работе

**Найдено при разметке роутов.** Три мутации проекта не проверяли владение
вообще — достаточно было быть залогиненным:

| Роут | Что позволял сделать с чужой сущностью |
|---|---|
| `PUT /api/user/project?id=…` | менять проект целиком: название, статус, и через `authorId` — владельца |
| `PUT /api/user/project/workflow/step` | двигать воркфлоу по id шага |
| `PUT …/project/vacancy/candidate/{hire,fire,reject}` | нанимать, увольнять и отклонять в чужой команде |
| `PUT …/event/[id]/{publish,unpublish,archive,restore}` | публиковать, снимать с публикации и архивировать любой эвент |
| `PUT …/event/[id]/generate-slug`, `POST …/duplicate` | переписать слаг и скопировать любой эвент |
| `POST …/event/[id]/schedule`, `PUT`/`DELETE …/schedule/[itemId]` | править расписание любого эвента |
| `PUT …/course/[id]/{publish,unpublish}` | публиковать и снимать с публикации любой курс |
| `PUT`/`DELETE …/project/equity/member` | переписать или удалить **чужую долю** по id обещания — хендлер даже не читал, кто вызывает |
| `PUT …/project/link` | переписать ссылки любого проекта |

Гейты спейсов это не закрывали: они защищают страницы, а API дёргается напрямую.
Все перечисленные закрыты.

Ложные срабатывания эвристики, проверенные глазами и **не тронутые**:
`advice-request/[id]/accept` (`toUser.id !== currentUser.id`),
`vacancy/payment` (`authorizeVacancy` в обоих методах), `vacancy/restore`,
`equity/route.ts` PUT, `equity/transaction/transfer` (переводит долю **от себя**,
защищён по построению). Автоматический поиск врёт в обе стороны, каждое попадание
смотрелось руками.

Попутно нашлось упущение в каталоге: у эвента есть статус `Archived`, а действия
`archive` в его `lifecycle` не было — добавлено, матрица пересеяна (+4 строки).

Сделано:

- [space-guard.ts](../src/lib/space-guard.ts) — `withSpaceGuard({ permission, idFrom })`.
  Коды ответов разведены по смыслу: **404** — роли в спейсе нет (спейс не должен
  быть виден), **403** — роль есть, права нет, **503** — матрица деградировала и
  ответ неизвестен. Отдавать 403 во время аварии значит отправить человека искать
  не ту проблему;
- `idFrom` принимает `query.x` / `body.x` / `params.x` **или функцию** — для
  роутов, адресующих вложенную сущность (шаг воркфлоу, кандидат), где id проекта
  надо сперва найти. Резолверы собраны в [space-ids.ts](../src/lib/space-ids.ts);
- `apiError.unavailable()` (503) добавлен в [api-handlers.ts](../src/lib/api-handlers.ts);
- [tests/space-guard.test.ts](../tests/space-guard.test.ts) — 11 кейсов: 401/403/404/503,
  извлечение id из query / body / params / функции, отказ в архивном проекте,
  проход супер-админа.

Переведено полностью:

| Группа | Файлов | Что было |
|---|---|---|
| Дыры без всякой проверки | 17 | ничего |
| Документы проекта | 2 | `withTeamGuard` (любой участник команды) |
| Эвенты: сертификаты и участники | 12 | `!isAdmin && createdById !== currentUser.id` |
| Проект: доли, вакансии, команда | 8 | `authorId` / `Founder` |
| Админка и смежное | 20 | `withAuth({ roles: [UserRole.Admin] })` |

**В `src/app/api` не осталось ни одной проверки доступа по `UserRole`.** Легаси
роль читается ровно в одном месте — адаптере хаба
([hub.space.ts](../src/repositories/hub.space.ts)), — откуда уедет в фазе 5,
когда роль начнёт браться из `SpaceMember`.

В каталог админского спейса добавлены `projects` и `lectures` (были роуты без
соответствующих прав); матрица пересеяна: 308 строк, +16.

**Аудит.** Отказы и байпасы супер-админа пишутся в `AuditLog` под собственными
действиями `ACCESS_DENIED` / `ACCESS_OVERRIDE` (появились в `beta.41`):
`entity = "space_access"`, `entityId = "<spaceType>:<spaceId>"`, право, роль и
роут — в `meta`. Плюс строка в лог, всегда.

Две детали, без которых это было бы вредно:

- **отказы троттлятся**: одна и та же пара (юзер, право, спейс) пишется раз в
  минуту на процесс. Отказанный запрос дёшево повторить, и скриптом легко залить
  таблицу одинаковыми строками; лог при этом пишется каждый раз, так что ничего
  не теряется. Байпас супер-админа не троттлится никогда;
- **падение аудита не роняет запрос**: запись обёрнута в try/catch, есть тест.

Попутно закрыт пробел, не связанный с RBAC: гейт оборачивает хендлер в
`withAuditContext({ actorUserId })`, поэтому строки `AuditLog`, которые пишет
расширение Prisma при изменении данных, наконец получают автора. До этого
контекст не выставлял никто, и записи были безымянными.

### Фаза 3 — исходный план

- `withSpaceGuard({ permission, idFrom })` в `src/lib/api-handlers.ts`,
  композируется через `pipe`, кладёт `access` в `locals`.
- Перевод роутов по спейсу за раз: `project` (там 4 самодельные проверки и
  больше всего мутаций) → `event` → `course` → `admin`.
- Аудит: каждый отказ и каждое действие по байпасу супер-админа пишутся в
  `AuditLog` (`entity: "space_access"`).

**Тесты (критично):** `tests/space-guard.test.ts` — 403 без права, 404 при
`role = none`, извлечение id из `params` и из `body`, `own`-скоуп подмешивает
`where`. Плюс по одному тесту на каждый переведённый мутирующий роут проекта:
приглашение в команду, правка долей, архивация.

### Фаза 4 — клиент — сделано

- [AccessProvider](../src/components/access/AccessProvider.tsx) + `useAccess()`.
  Провайдеры **вкладываются и сливаются**: `(app)/layout.tsx` кладёт доступы к
  `hub` и `admin`, гейт спейса добавляет свой. Поэтому страница внутри проекта
  видит и `hub.*`, и `project.*`, ничего не прокидывая пропсами;
- пространство выводится **из префикса права**: `can("project.info.edit")` сам
  находит нужный снимок, «текущий спейс» знать не нужно;
- [snapshot.ts](../src/services/access/snapshot.ts) — сериализуемая форма:
  `Set` и `Map` не переживают границу сервер→клиент.

Заменено в 13 файлах. Показательные случаи:

| Было | Стало |
|---|---|
| `hasRole(Admin)` в шапке → ссылка на админку | `can("admin.users.view")` |
| `isProjectAuthor && !isProjectArchived` (воркфлоу, команда) | `can("project.workflow.edit")` — архив снимает `*.edit` на сервере, отдельная проверка не нужна |
| `isProjectAuthor` в `EquitySection` | проп `canManageEquity` |
| `hasRole(Admin)` для типов эвентов и дат в прошлом | `isIn("admin")` — «стафф» теперь означает «имеет доступ в спейс admin», а не легаси-роль |
| `hasRole(Author)` в талант-пуле | `can("hub.talent_pool.view")`; продуктовое условие `hasApprovedProjects` осталось |

**Не тронут `PublicShell`** — единственный оставшийся `hasRole`. Он вне `(app)`,
провайдера там нет, а добавить его значит позвать `auth()` в `(public)/layout.tsx`
и перевести публичные SEO-страницы из статики в динамику. Правильное решение —
положить признак стаффа в JWT при бэкфилле (фаза 5) и читать его из сессии.

### Фаза 4 — исходный план

- `SpaceAccessProvider` + `useSpaceAccess()` — по образцу
  [SpaceHeader](../src/components/layouts/SpaceHeader/index.tsx).
- Замена `isProjectAuthor` / `isEventAuthor` / `hasRole(...)` на `can(...)` —
  14 файлов.
- Меню спейса строится из прав (пункт виден, если есть хотя бы одно право
  соответствующего feature).

**Тесты:** e2e — участник проекта не видит danger-зону и вкладку вакансий;
владелец видит. Расширяем `tests/e2e/protected-misc.spec.ts`.

### Фаза 5 — членство и бэкфилл (app, **нужен P1**)

- Сервис членства: `joinSpace`, `inviteToSpace`, `deleteSpaceMembership`.
- `scripts/rbac-backfill.ts` — перевод текущих пользователей (см. ниже).
- Переключение источника роли: сначала `SpaceMember`, адаптерный `resolveRole`
  остаётся запасным на один релиз, потом удаляется.
- Вызовы `joinSpace(owner)` при создании проекта / эвента / курса и
  `deleteSpaceMembership` при удалении — в тех же транзакциях.

**Тесты (критично):** интеграционный тест бэкфилла на докерной БД — фикстуры с
проектом, командой, эвентом, курсом, админом; проверяем итоговые роли и то, что
повторный запуск ничего не меняет.

### Фаза 6 — админка (app) — сделано

Что получилось и чем отличается от изначального плана:

- **Новая фича `admin.roles`** (`view` / `manage`) — страница матрицы должна
  закрываться собственным правом, иначе её охраняет `admin.users.manage`, к
  редактированию прав отношения не имеющее. Каталог admin-спейса вырос до 15
  прав; после деплоя нужен `bun run rbac:seed-matrix`.
- **`customRoleKey` заработал.** До этой фазы поле в `SpaceMember` было, но
  резолвер его не читал — кастомная роль ничего бы не сужала. Теперь
  [index.ts](../src/services/access/index.ts) берёт права из `SpaceCustomRole`,
  когда роль в членстве и есть выигравшая роль; если ключ ни во что не
  разрешается, прав нет вовсе (иначе удаление роли было бы тихим повышением).
- **Фича `admin.lectures` убрана.** Отдельных лекций не будет: занятия живут
  внутри курсов, разовые выступления — это события. Вместе с ней удалены
  `api/admin/lecture/speaker(s)` — их не вызывал ни один экран, а `PUT` там писал
  в `LecturerRequest` нераспарсенное тело. Пользовательская часть лекций
  (`api/user/lecture/**`, `components/lectures`, `components/modals/*Lecture*`)
  не тронута — это отдельная миграция на курсы и события.
- **Аудит пишется руками**, а не расширением пакета: `AUDITED_MODELS` в
  `@gdhub-io/gdhub-prisma` покрывает только доменные модели. Строка на намерение
  («у admin отобрали `admin.users.manage`») полезнее строки на каждую запись —
  одно сохранение трогает все права роли. См. `logRbacChange` в
  [audit.ts](../src/services/access/audit.ts). Задачи для пакета из этого не
  возникает.
- **Кастомные роли без `description`.** В макете у них было описание, а в модели
  только `key` / `title` / `permissions`. Вместо поля список показывает сводку по
  правам — она не может разойтись с действительностью.
- **Границы того, кто что раздаёт** (в `applyMembershipChanges`): нельзя выдать
  роль сильнее собственной в хабе, нельзя править своё членство, и членство в
  project / event / course меняет только супер-админ — админ платформы иначе
  добавил бы себя владельцем любого проекта в обход §2.2.

**6.1 Роли пользователя** — на `/admin/users`:
- колонка «Роли» с текущим членством (хаб + спейсы, где есть роль);
- модалка: выдать/снять роль в хабе (`guest` / `member` / `admin` / `owner`),
  назначить кастомную роль в спейсе `admin`;
- всё пишется через сервис членства, каждое изменение — в `AuditLog`;
- `isSuperAdmin` в интерфейсе **не показывается и не редактируется** — только
  SQL (§2.1 дизайна).

**6.2 Страница `/admin/roles`** — матрица и кастомные роли:
- сетка `spaceType × role × permission` с чекбоксами, группировка по features,
  фильтр по спейсу; сохранение пишет `SpaceRolePermission` и `AuditLog`;
- кнопка «сбросить к дефолтам» — пересчёт из реестра для выбранного спейса;
- список кастомных ролей с созданием: `key`, `title`, набор прав галочками;
  права ограничены каталогом выбранного спейса;
- предупреждение при снятии прав у роли `admin` в спейсе `admin` — это тот
  случай, ради которого существует `isSuperAdmin`.

**Тесты:** [rbac-role-catalog](../tests/rbac-role-catalog.test.ts) (10) — каталог,
дефолты, отказ от чужого права; [rbac-custom-roles](../tests/rbac-custom-roles.test.ts)
(5) — кастомная роль сужает, удалённая не повышает, инстанс важнее шаблона;
[rbac-user-memberships](../tests/rbac-user-memberships.test.ts) (9) — границы
выдачи ролей. E2E «снял галочку — право пропало» пока нет: нужна БД, вынесено в
бэклог.

### Фаза 7 — чистка (app + **P2**)

**Сделано: в коде не осталось ни одной проверки доступа по `UserRole`.**

- **`proxy.ts`** больше ничего не решает по ролям. Проверка прав туда и не
  помещается: middleware исполняется на edge, где нет БД и, значит, нет матрицы —
  всё, что она умела, это смотреть в список ролей из сессии. `/live/room/reports`
  закрыт `hub.live_room.use` в собственном `layout.tsx`.
- **`createPermissionGate`** в [space-gate.tsx](../src/lib/space-gate.tsx) —
  серверный аналог `withSpaceGuard` для страницы внутри спейса. Нет права → 404,
  как и в гейте спейса: страница, которую никому нельзя открыть, не должна
  подтверждать, что она есть.
- **`isStaff(access)`** в [services/access](../src/services/access/index.ts) — для
  горстки правил, которые про старшинство, а не про фичу: пейволл, под который
  сотрудники не попадают, продуктовое правило, вне которого они стоят.
  Использован в `hub/members`, `api/specialist`, `api/user/project/ai-candidates`.
- **`Locals.access`** в [api-handlers.ts](../src/lib/api-handlers.ts) — `pipe`
  стирает типы обёрток, и без этого поля хендлер не мог прочитать то, что
  `withSpaceGuard` в него положил.

Попутно закрыты ещё три дыры того же вида, что и в фазе 3:

| Роут | Что было |
|---|---|
| `PUT /api/project/move` | `withAuth({ roles: [Author] })` — автор любого проекта двигал workflow **любого** |
| `PUT /api/user/event/[id]` | вообще без проверки владельца |
| `DELETE /api/user/event/[id]` | вообще без проверки владельца |

**Роли как данные профиля — тоже убраны.** Решение: удаляется не три значения, а
`User.roles` целиком — все пять покрыты другими источниками.

| Значение | Чем покрыто |
|---|---|
| `Guest` / `Member` | `SpaceMember(hub, default, Guest\|Member)` |
| `Admin` | `SpaceMember(hub, default, Admin)` |
| `Author` | `SpaceMember(project, *, Owner)` |
| `Mentor` | `Speciality.isOpenForMentoring` |

Что сделано:

- **онбординг** больше не пишет роли. Шаг «интерес» остаётся: `primaryInterest` —
  это пожелание («чем хочу заниматься»), от него зависят только первый экран и
  матчинг, где он уже используется. Заодно ушёл мёртвый код: роль вычислялась из
  выбора пользователя и выбрасывалась — писалось жёсткое `[Member, Author]`, у
  всех одинаковое;
- **завершение онбординга теперь пишет `SpaceMember(hub, Member)`.** Раньше это
  каждый раз выводил адаптер из `onboardingDone`; без записи новые пользователи
  после снятия адаптера навсегда остались бы гостями;
- **`api/user/profile`** больше не синхронизирует `Author` / `Mentor` с
  `primaryInterest` (60 строк перекладывания массива);
- **`api/user/project`** не клеймит автора при создании и апдейте проекта —
  владение это строка `SpaceMember(project, Owner)`, которая пишется рядом.

**Осталось два хвоста, оба со своим блокером:**

| Что | Блокер |
|---|---|
| Тумблер менторства → `Speciality.isOpenForMentoring` | поля ещё нет в пакете, п. 2 [задания](gdhub-prisma-rbac-tasks.md) |
| Адаптер [hub.space.ts](../src/repositories/hub.space.ts) — последний читатель `UserRole.Admin` | снимается **после** прогона бэкфилла на проде |

Персонализация интерфейса по персоне (ради которой роли и заводились) в объём не
входит.

## Скрипт миграции пользователей

`scripts/rbac-backfill.ts`, запуск `bun run scripts/rbac-backfill.ts [--dry-run]`.
Идемпотентный: повторный запуск не создаёт дублей (`upsert` по
`@@unique([spaceType, spaceId, userId])`).

| Источник | Результат |
|---|---|
| `User.onboardingDone = true` | `SpaceMember(hub, "default", Member)` |
| `User.onboardingDone = false` | `SpaceMember(hub, "default", Guest)` |
| `User.roles` содержит `Admin` | `SpaceMember(hub, "default", Admin)` |
| `Project.authorId` | `SpaceMember(project, projectId, Owner)` |
| `TeamMember.status = Founder` | `SpaceMember(project, projectId, Owner)` |
| `TeamMember.status = Hired` | `SpaceMember(project, projectId, Member)` |
| `TeamMember.status = Applicant/Rejected/Fired` | пропускаем — внутрь спейса не пускают (§2.2 дизайна) |
| `Event.createdById` | `SpaceMember(event, eventId, Owner)` |
| `EventMember.status = Approved` | `SpaceMember(event, eventId, Member)` |
| `Course.createdById` | `SpaceMember(course, courseId, Owner)` |
| `CourseGroupStudent.status = Enrolled/Finished` | `SpaceMember(course, courseId, Member)` |

Правила:

- при конфликте побеждает старшая роль (`owner > admin > member > guest`);
- `isSuperAdmin` скрипт **не выставляет** — это ручное действие для одного-двух
  человек, отдельной строкой в README запуска;
- гостей в project / event / course не создаём: таких статусов нет (§2.2);
- вывод: сколько строк создано, обновлено, пропущено, и список конфликтов —
  чтобы глазами проверить перед прогоном без `--dry-run`.

Порядок на проде: `--dry-run` → глазами → прогон → выборочная проверка десятка
пользователей → включение `RBAC_ENFORCE`.

## Порядок и зависимости

```
Ф1 (каталог)  ──┐
                ├──► Ф2 (резолвер, гейты) ──► Ф3 (API) ──► Ф4 (клиент) ──┐
P1 (пакет) ─────┘                                                        │
                                                                         ▼
                                    Ф5 (членство + бэкфилл) ──► Ф6 (админка) ──► Ф7 + P2
```

- **P1 начинать сразу** — он единственный, что блокирует, и делается независимо
  от фазы 1.
- Ф3 и Ф4 можно вести параллельно после Ф2 (разные слои).
- Ф5 не мешает Ф3–Ф4: роль до бэкфилла берётся из адаптеров.
- P2 — последним, когда в коде не осталось проверок по `UserRole`.

## Риски и как их снимаем

| Риск | Мера |
|---|---|
| Матрица не засижена, а проверки уже включены — запирает всех | `RBAC_ENFORCE=false` в фазах 2–3: отказы логируются, но не блокируют |
| Неудачная правка матрицы в админке закрывает саму админку | `isSuperAdmin` появляется в фазе 2 — **раньше** админки (фаза 6) |
| Бэкфилл выдал не ту роль | `--dry-run` с отчётом, интеграционный тест на фикстурах, идемпотентность |
| Права разъехались с реальностью после релиза пакета | Тест: каждое право из матрицы существует в каталоге кода, каждое право каталога есть в матрице |
| Забыли `deleteSpaceMembership` при удалении сущности | Тест на сервис + периодический отчёт о висячих строках |

## Изменение модели по ходу фазы 3: стафф не ходит в чужие спейсы

Изначально в дизайне (§2, инвариант 5) было: `hub.admin` получает `admin` в
**любом** спейсе. По ходу перевода роутов это уточнилось до обратного:
администратор платформы видит проекты и эвенты через админку, но **внутрь спейса
не заходит и ничего там не меняет** — это может только супер-админ.

Что поменялось:

- в [access/index.ts](../src/services/access/index.ts) убрано правило
  `staffRole`; роль в хабе теперь влияет только на спейсы, которые её явно
  наследуют (`admin`, `dev` через `inheritRoleFrom`);
- §2 инвариант 5 и §8 дизайна переписаны;
- тесты: «стафф управляет любым спейсом» → «стафф не получает роли в чужом
  проекте, эвенте и курсе», плюс кейс «роль, заработанную обычным путём,
  сохраняет».

**Следствие, которое надо знать.** В эвентах инлайновая проверка выглядела как
`!isAdmin && event.createdById !== currentUser.id`, то есть платформенный админ
мог управлять сертификатами и участниками **любого** эвента. После перевода на
права этой лазейки нет: остаются создатель, приглашённые админы спейса и
супер-админ. Если сотрудники поддержки этим пользовались — им нужен либо
`isSuperAdmin`, либо явная роль `admin` в конкретном эвенте.
