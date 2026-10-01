# Roles & Permissions

> Дизайн системы доступов для spaces. **Реализация — отдельной задачей**, здесь
> только договорённости.
>
> Главное требование: **универсальность**. Спейсов со временем станет больше,
> поэтому добавление нового не должно трогать гейты, API-враппер, провайдер и UI.
> Новый спейс = файл-описатель, сид матрицы и пара вызовов при создании и
> удалении сущности — полный список в §10.
>
> Готовая матрица «спейс × роль × право» — в
> [roles-and-permissions-matrix.md](roles-and-permissions-matrix.md)
> (генерируется из реестра).
>
> Реализация идёт по [плану](roles-and-permissions-plan.md); резолвер живёт в
> [src/services/access](../src/services/access/index.ts), гейты спейсов — в
> [space-gate.tsx](../src/lib/space-gate.tsx).

## 1. Понятия

| Термин | Что это |
|---|---|
| **Space** | Область с собственным членством и навигацией. Сейчас: `hub`, `project`, `event`, `course`, `admin`, `dev`. |
| **Space kind** | Тип спейса, описанный двумя частями (§4): конфигурация прав (features, отклонения от дефолтов) и — необязательно — адаптер, который умеет вычислить роль и состояние сущности. |
| **Space instance** | Конкретный экземпляр: пара `(spaceType, spaceId)`, где `spaceId` — **id доменной сущности**: `Project.id`, `Event.id`, `Course.id`. Отдельного реестра спейсов нет (§5.1). У одноэкземплярных (`hub`, `admin`, `dev`) сущности нет, поэтому `spaceId = "default"`. |
| **Space role** | Роль юзера в **конкретном экземпляре**: `owner`, `admin`, `member`, `guest`. Плюс служебное `none` — доступа нет. |
| **Feature** | Функциональный блок спейса со своим набором действий: `workflow`, `artifacts`, `schedule`, `devlog`, `certificates`, `equity`… Объявляется **внутри своего спейса** (§3); одинаковые имена в разных спейсах независимы. |
| **Permission** | `{spaceType}.{feature}.{action}` — `project.members.invite`, `event.certificates.issue`. Собирается автоматически, руками не перечисляется. |

Правило разделения ответственности:

- **features спейса и их действия** — в коде, в файле-описателе спейса;
- **словарь допустимых действий** — в коде, общий на всю систему;
- **матрица «роль → права»** — в БД, настраивается в админке;
- **UI и админка оперируют ролями**, весь код — правами.

## 2. Роли

| Роль | Смысл |
|---|---|
| `owner` | Создал спейс, распоряжается полностью. Единственный, кто может удалить/архивировать |
| `admin` | Управляет спейсом, но не владеет им. Роль выдаётся **в конкретном спейсе** — администрирование платформы её не даёт (инвариант 5) |
| `member` | Вступил: нанят в команду, одобрен на эвент, зачислен на курс, прошёл онбординг в хабе |
| `guest` | Наблюдатель: видит спейс, но не участвует. В хабе — состояние до онбординга, в остальных спейсах выдаётся **только явным приглашением** (§2.2) |
| `none` | Не имеет отношения к спейсу → `notFound()` |

Инварианты:

1. **Одна роль на пару (user, space).** Если подходит несколько источников —
   максимум по старшинству `owner > admin > member > guest > none`.
2. **`none` отдаёт 404, а не 403** — чтобы не подтверждать существование чужой
   сущности. Так работает и сейчас.
3. `guest` ≠ `none`: гость видит спейс в режиме чтения. Роль эта **никогда не
   выдаётся автоматически** — только приглашением с явно выбранной ролью (§2.2).
   Исключение одно: в хабе `guest` — это состояние до онбординга.
4. Набор ролей фиксирован. Если когда-нибудь понадобятся кастомные роли внутри
   спейса — это отдельная таблица `SpaceCustomRole`, не расширение этих четырёх.
5. **Роль в хабе даёт администрирование платформы, но не доступ в чужие
   спейсы.** `hub.admin` — сотрудник платформы: открывает спейсы `admin` и `dev`
   (через `inheritRoleFrom`) и всё, что там есть, включая списки проектов и
   эвентов. Но внутрь спейса проекта, эвента или курса это его **не пускает**:
   администрировать платформу и участвовать в чужом проекте — разные вещи.
   Единственный, кто пересекает эту границу, — супер-админ (§2.1), осознанно и
   с записью в аудит.
   `hub.owner` — владелец хаба; сейчас необязателен, обретает смысл, когда хабов
   станет несколько (§4).
6. **Супер-админ — это другое.** Не роль и не членство, а флаг
   `User.isSuperAdmin` в обход всей системы — нужен ровно для того, чтобы
   починить её, когда сломали (см. §2.1).

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
позже, кастомные роли в спейсе `admin` (§5.6), а не второй `isSuperAdmin`.

### 2.2 Где заканчивается спейс

В спейс сущности (`project`, `event`, `course`) попадают те, у кого **уже есть
роль**: нанятый в команду, одобренный участник, зачисленный студент, владелец.
Всё, что «до» — посмотреть, заинтересоваться, подать заявку, откликнуться на
вакансию, записаться на курс — живёт **снаружи**: на публичных страницах и в
витринах хаба.

Отсюда следствия, которые легко упустить:

- `TeamMemberStatus.Applicant`, `EventMemberStatus.Pending`,
  `CourseStudentStatus.Blocked/Expelled` → `none`, а не `guest`. Заявка — это
  ещё не членство, и внутрь она не пускает;
- гость в спейсе появляется **только через приглашение** с явно выбранной ролью
  (`SpaceInvitation.role = Guest`) — например, позвать инвестора посмотреть
  проект или коллегу — программу эвента. Ни один доменный статус в `guest` не
  отображается;
- в хабе `guest` — единственное исключение: это состояние «зарегистрировался, но
  не прошёл онбординг», и оно выставляется автоматически.

Это же отвечает на вопрос «почему у эвента нет страницы заявок»: заявки — не
часть спейса. Управление ими — да (`event.members.manage`), сама подача — нет.

**Что видит приглашённый гость.** Права ему нужны, иначе он войдёт в спейс и
увидит пустоту. Дефолт консервативный — только чтение витринной части, дальше
правится в админке:

| Спейс | Гостевые права по умолчанию |
|---|---|
| `project` | `project.info.view`, `project.devlog.view` |
| `event` | `event.info.view`, `event.schedule.view` |
| `course` | `course.info.view`, `course.curriculum.view` |

Всё остальное — команда, документы, доли, участники, контент — закрыто: гость
наблюдает, а не работает.

**Что пока не делаем.** В формах приглашения выбор роли не показываем — зовём
только участниками, `SpaceInvitation.role` всегда `Member`. То есть гостей в
`project` / `event` / `course` сегодня физически нет. Матрица при этом заполнена
заранее и осознанно: когда выбор роли в форме появится, права наблюдателя не
придётся придумывать задним числом, а до тех пор гостевая колонка просто ни на
кого не действует.

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

**Features объявляются внутри спейса, общего каталога features нет.** Одинаковые
слова в разных спейсах означают разное: `members` в проекте — это найм, доли и
роли в команде, `members` в эвенте — одобрение заявок на участие. Общее
объявление создаёт ложную эквивалентность: одному спейсу понадобится новый
action, и он протечёт во все остальные. Права и так неймспейснуты
(`project.members.invite` ≠ `event.members.invite`), так что общий словарь
ничего не экономит в рантайме.

Переиспользуется не список features, а **словарь действий** (§3.3) и **дефолты
по классам действий** (§3.5) — именно они держат систему однородной.

### 3.1 Вход в спейс — это не право

Права `{spaceType}.view` нет и не будет. Если у юзера есть **любая** роль в
спейсе (включая `guest`), он в спейс входит; если роли нет — это `none` и 404.
Отдельная галочка «может видеть спейс» была бы не просто избыточной, а вредной:
сняв `project.view` у роли `member`, мы получили бы противоречие — участник
спейса, который не может его открыть.

Следствие для гейта: `createSpaceGate` проверяет `role !== "none"` и ничего
больше. Правами закрыто содержимое, а не вход.

### 3.2 Формат права — всегда `{space}.{feature}.{action}`

Одна форма, без исключений. То, что не укладывается в неё, — не право:

| Не право | Чем определяется |
|---|---|
| Войти в спейс | ролью: любая роль ≠ `none` (§3.1) |
| Открыть страницу настроек | наличием хотя бы одной доступной секции (§3.6) |

Ни `{space}.view`, ни `{space}.settings.*` в системе нет.

Но «поменять название проекта» и «архивировать проект» — действия, и объект у
них есть: это карточка спейса и его состояние. Значит, это обычные features,
просто они описывают сам спейс, а не его раздел:

| Feature | Что за объект | Действия |
|---|---|---|
| `info` | Карточка спейса: название, описание, обложка, ссылки | `view`, `edit` |
| `lifecycle` | Состояние спейса | `publish`, `archive`, `delete` |

```
project.info.edit          общие поля настроек
project.lifecycle.archive  ┐ danger-зона
project.lifecycle.delete   ┘
event.lifecycle.publish    публикация эвента
```

Оба объявляются в описателе наравне с остальными — «встроенных» features нет:

```ts
features: {
  info:      ["view", "edit"],
  lifecycle: ["archive", "delete"],
  members:   ["view", "invite", "remove"],
  // …
}
```

Спейс, который нельзя ни настроить, ни удалить (`dev`), их просто не объявляет.

### 3.3 Словарь действий — единственное, что общее

Feature может использовать только действия из этого списка. Иначе в одном
спейсе появится `issue`, в другом `give`, в третьем `grant`, и матрица в админке
станет нечитаемой. Проверяется типом и тестом на сиде.

```ts
// src/config/permissions/actions.ts
export const ACTIONS = [
  "view", "access", "use",              // чтение и вход
  "create", "apply", "request", "contact",
  "edit", "manage", "invite", "remove", "review", "publish", "issue", "teach",
  "archive", "delete",
] as const;
```

Новое действие добавляется осознанно и сразу получает класс в таблице §3.5 —
это единственное место, где новый спейс может потребовать правки общего кода.

**Как отличить feature от action.** Feature — это *объект*: раздел, сущность,
инструмент. Action — то, что с ним делают. Если имя отвечает на вопрос «что
делают» (`moderation`, `management`, `administration`), это action, а не feature.

Поэтому модерации как отдельного feature нет: она всегда `review` на том, что
модерируют — `admin.devlog_posts.review`, `hub.talent_pool.review`. Иначе одна
галочка «модерация» дала бы власть над всем сразу, а в матрице было бы
невозможно понять, что именно она открывает.

Проверка простая: `settings` не проходит (это «где меняют», а не «что»),
а `info` и `lifecycle` проходят — карточка спейса и его состояние это объекты.

### 3.4 Features по спейсам

Каждый описатель объявляет свои features сам:

```ts
// src/config/spaces/project.ts
export const projectSpace = defineSpace({
  type: "project",
  features: {
    info:      ["view", "edit"],
    lifecycle: ["archive", "delete"],
    members:   ["view", "invite", "remove"],
    artifacts: ["view", "manage"],
    workflow:  ["view", "edit"],
    vacancies: ["view", "manage", "review"],
    equity:    ["view", "manage"],
    devlog:    ["view", "create", "publish"],
  },
  // …
});
```

| Спейс | Features |
|---|---|
| `hub` | `talent_pool`, `projects`, `events`, `courses`, `jobs`, `experts`, `chat`, `live_room` |
| `project` | `info`, `lifecycle`, `members`, `artifacts`, `workflow`, `vacancies`, `equity`, `devlog` |
| `event` | `info`, `lifecycle`, `members`, `content`, `schedule`, `certificates` |
| `course` | `info`, `lifecycle`, `curriculum`, `classroom`, `students`, `groups`, `content`, `certificates` |
| `admin` | `users`, `posts`, `devlog_posts`, `workflow`, `audit_logs` |
| `dev` | `tools` |

Да, `certificates: ["view", "issue"]` продублируется в `event` и `course` — это
две строки, и они того стоят: спейсы смогут разойтись (например, у курса
появится `revoke`), не задевая друг друга.

**Действие может требовать прав из двух спейсов.** «Предложить позицию»
специалисту из талант-пула — это `hub.talent_pool.contact` (дойти до человека)
**и** `project.vacancies.manage` (действовать от имени проекта, чью вакансию
предлагают). Отдельного права `talent_pool.offer` заводить не нужно: оно бы
продублировало проверку вакансии, которая всё равно обязана быть.

**`project.workflow` vs `{space}.lifecycle` vs `admin.workflow`** — похожие
имена, разные вещи, поэтому фиксируем словарь:

| Feature | Про что | Что за ним в коде |
|---|---|---|
| `project.workflow` | Процесс **внутри** проекта: стадии и задачи, по которым он движется | `ProjectWorkflow` → `ProjectWorkflowStep` → `ProjectWorkflowTask`, компонент `WorkflowContent`, страницы `/user/project/[slug]` и `/workflow` |
| `{space}.lifecycle` | Состояние **самого спейса**: опубликован, архивирован, удалён | `Project.status`, `Event.status`; danger-зона настроек |
| `admin.workflow` | Воркфлоу **с платформенной стороны**: библиотека шаблонов и правка процесса любого проекта | `WorkflowSchema` + `WorkflowEditor type="project"`, страницы `/admin/workflows`, `/admin/workflow/[id]`, `/admin/project-workflow/[id]` |

Связь между первыми двумя односторонняя: `project.lifecycle.archive` переводит
проект в `Archived`, а `revoked` в адаптере (§7) после этого снимает все
`*.edit` — включая `project.workflow.edit`. Обратной зависимости нет: работа с доской процесса
никогда не меняет состояние спейса.

### 3.5 Дефолты по классам действий

Дефолт задаётся **по типу действия**, а не перечислением каждой строки:

| Класс действия | owner | admin | member | guest |
|---|---|---|---|---|
| `view`, `access`, `create`, `use`, `apply`, `request`, `contact` | ✅ | ✅ | ✅ | — |
| `edit`, `manage`, `invite`, `remove`, `publish`, `issue`, `teach`, `review` | ✅ | ✅ | — | — |
| `archive`, `delete` | ✅ | — | — | — |

Спейс переопределяет только исключения — их немного:

- гостевые `*.view` в `project` / `event` / `course` — приглашённому наблюдателю
  (§2.2); класс действия `view` гостю по умолчанию не выдаётся;
- `project.equity.view` для `member` — только свои доли (`own`-скоуп, см. §7);
- в хабе гость получает только витрины (`hub.projects.view`,
  `hub.events.view`, `hub.courses.view`, `hub.jobs.view`, `hub.experts.view`);
  `talent_pool`, `*.create`, `jobs.apply`, `chat.use`, `experts.request`
  остаются за онбордингом.

Итого «матрица на 120 галочек» не пишется руками: она **генерируется** из
features спейса и дефолтов, затем правится в админке.

### 3.6 Settings — контейнер, а не одно право

Страница настроек — контейнер: собственного права у неё нет, каждая секция
закрыта правом того, чем она управляет.

| Секция | Право | Роль |
|---|---|---|
| `general` (название, описание, обложка) | `{space}.info.edit` | admin |
| `danger` (архивация, удаление) | `{space}.lifecycle.archive` / `.delete` | **owner** |
| team / участники | `{space}.members.invite` / `.remove` | admin |
| доли (project) | `project.equity.manage` | admin |
| интеграции, вебхуки | `{space}.info.edit` | admin |

Отсюда же следует, как рендерить страницу: сайдбар настроек строится из прав —
пункт показывается, если у роли есть соответствующее право. Доступ к самой
странице отдельным правом не закрывается: если ни одной секции не доступно,
`/settings` отдаёт 404. Роль `member`, пришедшая по прямой ссылке, увидит только
свои секции и никогда — danger-зону.

Личные настройки аккаунта (`/user/settings/*`) под это правило **не подпадают** —
это не спейс, а свой профиль: там доступ определяется владением, а не ролью.

### 3.7 Preview-фичи и что с ними делать

`hub.live_room` — пример фичи, которая ещё не раскатана: живой видеочат, куда
владелец зовёт конкретных людей. Правило для таких случаев:

- права описываются сразу и честно (`use` — участвовать, `manage` — вести эфир),
  но в матрице `use` **снимается** у `member` через `overrides`. Класс действия
  выдал бы его автоматически — здесь мы осознанно отклоняемся от дефолта;
- открыть фичу шире = снять галочку в админке, кода это не требует;
- «владелец дал ссылку» механизмом доступа не является и в модели не
  описывается. Пока фича в preview, ограничение держится на том, что права нет
  ни у кого, кроме стаффа.

Если понадобится раскатывать фичи на подмножество пользователей (A/B, ранний
доступ), это **отдельный слой feature flags**, ортогональный ролям: `can()`
отвечает «позволено ли роли», флаг — «включена ли фича для этого юзера».
Смешивать их в одной матрице нельзя, иначе роль начнёт означать сразу и
полномочия, и стадию раскатки.

**Куда это приедет.** «Видеочат, где есть админ и участники, и владелец
приглашает» — дословное описание спейса. Когда комнат станет больше одной,
`live_room` перестаёт быть фичей хаба и становится спейсом:

```ts
export const liveRoomSpace = defineSpace({
  type: "live_room",
  features: { broadcast: ["use", "manage"], members: ["view", "invite", "remove"] },
});
// роут: (spaces)/live/[roomId]/layout.tsx → createSpaceGate("live_room", { param: "roomId" })
```

Приглашение превращается в `SpaceInvitation`, владелец комнаты — в `owner`,
позванные — в `member`. Никаких новых понятий: ровно тот механизм, что уже
описан в §5. Роут при этом переезжает в `(spaces)/live/[roomId]`.

## 4. Реестр спейсов

Спейс описывается **двумя** независимыми частями, и смешивать их нельзя:

| | Что | Где живёт | Знает про Prisma |
|---|---|---|---|
| **Конфигурация прав** | features, действия, отклонения от дефолтов, наследование роли | `src/config/spaces/*.ts` | **нет** |
| **Адаптер доступа** | как вычислить роль в этом спейсе и что отнимает состояние сущности | `src/repositories/*.space.ts` | да |

Разделение не косметическое. Конфигурация — чистые данные: её импортируют сид,
админка матрицы (клиентский компонент!) и юнит-тесты, и тащить туда Prisma
нельзя. Адаптер — доменный код, и лежать он должен рядом с доменом, а не в
конфиге прав.

### 4.1 Конфигурация — чистые данные

```ts
// src/config/spaces/project.ts
export const projectSpace = defineSpace({
  type: "project",
  features: {
    info:      ["view", "edit"],
    lifecycle: ["archive", "delete"],
    members:   ["view", "invite", "remove"],
    artifacts: ["view", "manage"],
    workflow:  ["view", "edit"],
    vacancies: ["view", "manage", "review"],
    equity:    ["view", "manage"],
    devlog:    ["view", "create", "publish"],
  },
  overrides: {
    // гость бывает только по приглашению и только смотрит (§2.2)
    guest: ["project.info.view", "project.devlog.view"],
    member: { "project.equity.view": "own" },
  },
});
```

```ts
// src/config/spaces/hub.ts
export const hubSpace = defineSpace({
  type: "hub",
  features: {
    talent_pool:  ["view", "contact"],   // contact — увидеть контакты и написать
    projects:     ["view", "create"],
    events:       ["view", "create"],
    courses:      ["view", "create"],
    jobs:         ["view", "apply"],
    experts:      ["view", "request"],
    chat:         ["use"],
    live_room:    ["use", "manage"],   // preview, см. §3.7
  },
  overrides: {
    // гость видит витрины, но не людей и ничего не создаёт
    guest: ["hub.projects.view", "hub.events.view", "hub.courses.view", "hub.jobs.view", "hub.experts.view"],
    // preview: участникам по умолчанию не выдаём, хотя класс действия это разрешал бы
    member: { "hub.live_room.use": false },
  },
});
```

```ts
// src/config/spaces/admin.ts
export const adminSpace = defineSpace({
  type: "admin",
  features: {
    users:        ["view", "manage"],
    posts:        ["view", "manage"],
    devlog_posts: ["view", "manage"],
    workflow:     ["view", "manage"],
    audit_logs:   ["view"],
  },
  /**
   * Своего членства пока нет: спейсом управляет платформенный стафф из хаба.
   * Явные строки SpaceMember(admin, …) начнут переопределять это правило,
   * когда появятся узкие роли (маркетолог, HR) — см. §5.6.
   */
  inheritRoleFrom: { space: "hub", atLeast: "admin" },
});
```

`inheritRoleFrom` — общий механизм, а не хак для админки: он же понадобится, если
у проекта появятся под-спейсы (спейс релиза, инвесторская комната), наследующие
роль родителя. Это по-прежнему чистые данные — ссылка на другой спейс, не запрос.

### 4.2 Адаптер — доменный код

```ts
// src/repositories/project.space.ts
registerSpaceAdapter("project", {
  /** Роль в спейсе. Пока читает доменные таблицы; после бэкфилла в SpaceMember — удаляется. */
  resolveRole: async (spaceId, user) => { /* prisma: author / TeamMember */ },

  /** Состояние сущности может ТОЛЬКО отнимать права. */
  revoked: async (spaceId) => {
    const project = await prisma.project.findUnique({
      where: { id: spaceId },
      select: { status: true },
    });
    return project?.status === ProjectStatus.Archived
      ? ["*.edit", "*.manage", "*.create"]
      : [];
  },
});
```

Адаптер необязателен. Спейсу, у которого роль полностью живёт в `SpaceMember` и
нет состояний, отнимающих права, он не нужен вовсе — а это все новые спейсы.
Сегодня адаптеры есть у `project`, `event`, `course` (легаси-членство) и `hub`
(роль из `onboardingDone`); `dev` ограничен окружением, `admin` наследует роль
от хаба.

### 4.3 Откуда берётся `spaceId`

`spaceId` — это id доменной сущности (§5.1). Имя параметра указывает вызывающий:
роут знает, как называется его сегмент, API-хендлер знает, где в теле лежит id.
Прописывать это в конфиге прав — значит держать знание о роутинге там, где оно
не нужно.

```ts
// src/app/(app)/(spaces)/user/project/[slug]/layout.tsx
export default createSpaceGate("project", { param: "slug" });

// API
withSpaceGuard({ permission: "project.members.invite", idFrom: "body.projectId" })
```

Если в параметре слаг, а не id, его превращает в id адаптер спейса — это
доменное знание (что у проекта есть `slug`, известно только проекту):

```ts
// src/repositories/project.space.ts
registerSpaceAdapter("project", {
  /** slug из роута → Project.id, он же spaceId. Кэшируется на запрос. */
  resolveSpaceId: async (param) =>
    (await prisma.project.findFirst({
      where: { OR: [{ slug: param }, { id: param }] },
      select: { id: true },
    }))?.id ?? null,
});
```

Если параметр не передан вовсе, берётся `"default"` — так одноэкземплярные
спейсы (`hub`, `admin`, `dev`) работают без единой строчки конфигурации.
Ветвления «singleton / entity» в коде нет.

```ts
// src/config/spaces/index.ts
export const SPACES = registerSpaces([
  hubSpace, projectSpace, eventSpace, courseSpace, adminSpace, devSpace,
]);
```

Что это даёт: гейты, `withSpaceGuard`, провайдер доступа, админка матрицы и сид
работают через `SPACES[type]` и **не знают** про конкретные спейсы. Добавление
спейса не меняет ни одну из этих точек.

### Если хабов станет несколько

Сценарии реальные: хабы по языкам/регионам, комьюнити-хаб под конкретную студию,
white-label. Переход не трогает конфигурацию прав вообще: роут становится
`(spaces)/hub/[hubSlug]` с `createSpaceGate("hub", { param: "hubSlug" })`, строки
`SpaceMember` с `spaceId = "default"` размечаются по нужному хабу. Слой доступа,
матрица прав и UI не меняются. Именно поэтому `spaceId` есть всегда, даже когда
экземпляр один.

## 5. Модель данных

### 5.1 Что такое `spaceId`

Отдельной таблицы `Space` нет — и не нужно: идентификатор экземпляра уже
существует, это **id доменной сущности**.

| Спейс | `spaceId` |
|---|---|
| `project` | `Project.id` |
| `event` | `Event.id` |
| `course` | `Course.id` |
| `hub`, `admin`, `dev` | `"default"` — сущности нет, экземпляр один |

Роут при этом может оперировать слагом (`/user/project/[slug]`): превращение
`slug → Project.id` делает адаптер (§4.3), а в `SpaceMember` всегда лежит id.
Слаг меняется, id — нет.

**Чем за это платим.** Внешнего ключа на домен нет — он был бы полиморфным, —
значит нет и каскада: удалили проект, а строки `SpaceMember` и `SpaceInvitation`
остались. Доступа они не дают (спейс больше не резолвится → 404), но это мусор,
который копится. Отсюда правило: **удаление сущности обязано в той же транзакции
звать `deleteSpaceMembership(type, id)`** — одна функция в сервисе членства,
рядом с `joinSpace`. Забыть про неё так же нельзя, как забыть выдать владельца
при создании.

Таблицу `Space` заводим тогда, когда у спейса появятся **собственные** атрибуты —
название, видимость, `matrixRoomId` (см. [chat-system.md](chat-system.md)). Тогда
она окупится: даст и внешние ключи, и место под эти поля. Пока таких атрибутов
нет, она только добавляет запись при создании и join при чтении.

### 5.2 Членство — одна таблица с самого начала

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

/// Приглашения в любой спейс — обобщение TeamInvitation. Роль выбирается явно:
/// Member по умолчанию, Guest — чтобы позвать наблюдателя (§2.2).
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

### 5.3 Матрица прав

```prisma
/// «Роль → права» по типу спейса. Сидируется из кода, правится в админке.
model SpaceRolePermission {
  id         String    @id @default(cuid())
  spaceType  String
  role       SpaceRole
  permission String    // "project.members.invite"
  allowed    Boolean   @default(true)
  scope      String?   // null | "own" — см. §7
  updatedAt  DateTime  @updatedAt

  @@unique([spaceType, role, permission])
  @@index([spaceType, role])
}
```

### 5.4 Почему `spaceId` не nullable

Соблазн описать одноэкземплярные спейсы как `spaceId String?` = `null` ломает
уникальность: в Postgres NULL'ы в уникальном индексе считаются различными, то
есть `@@unique([spaceType, spaceId, userId])` **не помешает** создать юзеру
несколько строк членства в хабе с разными ролями. Плюс каждый запрос обрастает
`spaceId: null` вместо обычного равенства. Отсюда `"default"` (§5.1).

### 5.5 Почему `spaceType`, `permission`, `feature` — строки, а не enum'ы

Prisma-схема живёт во внешнем пакете `@gdhub-io/gdhub-prisma`. Если типы спейсов
и права — enum'ы, каждый новый спейс (и каждое новое действие) требует релиза
пакета и миграции. Строка + реестр в коде как источник истины даёт то же
удобство типов на уровне TS (`keyof typeof SPACES`), а валидация делается сидом:
права, которых нет в каталоге, помечаются как устаревшие и удаляются.
`SpaceRole` остаётся enum'ом — набор ролей стабилен.

### 5.6 Узкие роли: маркетолог, HR, модератор

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

`SpaceMember` получает необязательное `customRoleKey`: если оно заполнено, права
берутся из кастомной роли, а поле `role` продолжает участвовать в старшинстве
(инвариант 1) — для кастомных ролей это `member`. То есть у маркетолога права
могут быть управляющими (`admin.posts.manage`), но при выборе максимальной роли
он не перебьёт настоящего `admin`. Это единственное изменение — `can()`, гейты и
UI не меняются.

Изначально это планировалось «на потом», но админке нужна страница создания
ролей, поэтому `SpaceCustomRole` входит в объём сразу — см. фазу 6 в
[плане реализации](roles-and-permissions-plan.md).

### 5.7 Чего сознательно НЕ делаем

- **Таблицы `Space`** — пока у спейса нет собственных атрибутов, см. §5.1.
- **Прав на уровне отдельной записи** (этот документ можно править, а тот — нет).
  Права выдаются на feature спейса целиком; «только своё» покрывает скоуп `own`
  (§7). Если понадобится больше, это ACL — отдельная система, а не расширение
  матрицы.
- **Иерархии ролей с наследованием прав** (`admin` наследует всё от `member`).
  Матрица плоская: каждая ячейка задаётся явно, иначе «почему у него это право»
  перестаёт читаться по одной строке.

## 6. Рантайм

### Сервер — единственный авторитет

```ts
// src/services/access/index.ts
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
1. параметр из вызова (`createSpaceGate` / `withSpaceGuard`) → `spaceId`:
   напрямую, либо через `adapter.resolveSpaceId` (слаг → id); нет параметра —
   `"default"`;
2. роль: `max(SpaceMember.role, adapter.resolveRole?.(), inheritRoleFrom?.())`;
   роль в хабе сама по себе доступа в чужой спейс не даёт (инвариант 5);
3. права: матрица из БД для `(type, role)`;
4. вычесть то, что вернул `adapter.revoked?.()`.

Роль в хабе резолвится только там, где спейс её наследует (`admin`, `dev`), —
один раз на запрос и вместе с остальным доступом.

Точки применения — все универсальные:

- **Гейт спейса.** Фабрика вместо копипасты в каждом `layout.tsx`:

  ```ts
  // src/app/(app)/(spaces)/user/project/[slug]/layout.tsx
  export default createSpaceGate("project", { param: "slug" });
  ```

- **API** — один враппер вместо самодельных `authorId === user.id`:

  ```ts
  export const PUT = pipe(
    withAuth({ mode: "user" }),
    withSpaceGuard({ permission: "project.members.invite", idFrom: "body.projectId" }),
    withValidation(Schema, "body"),
  )(async (_req, _ctx, { user, access, body }) => { … });
  ```

  Тип спейса выводится из префикса права, `idFrom` указывает вызывающий (§4.3).
  Он же единая точка аудит-лога (страница `admin/audit-logs` уже есть).

- **Кэш**: матрица читается один раз на процесс (in-memory + TTL ~60 c, сброс
  при записи из админки); роль резолвится один раз на запрос через React
  `cache()`.

### Клиент — только отображение

Серверный layout передаёт `SpaceAccess` в клиентский `SpaceAccessProvider` (по
образцу уже сделанного
[SpaceHeader](../src/components/layouts/SpaceHeader/index.tsx)); UI получает
`useSpaceAccess()` → `{ role, can(permission) }` и прячет/дизейблит элементы.
Навигация спейса тоже строится из прав: пункт меню показывается, если у роли
есть **хотя бы одно** право соответствующего feature — у `chat` и `tools` это
`use`, у `classroom` — `access`, у остальных обычно `view`. Значит новый спейс
получает корректное меню без правок в `SpaceHeader`.

Любая мутация перепроверяется на сервере: клиентский `can()` косметический.

## 7. Скоупы и модификаторы состояния

**Скоуп `own`** решает случаи «видит только своё» без отдельных прав:
`project.equity.view` со `scope = "own"` для `member` означает «только свои
доли». Проверка в запросе: `can(access, p) && scopeOf(access, p) === "own"` →
добавить `where: { userId: user.id }`. Скоупов ровно два: `null` (весь спейс) и
`own`.

**Модификаторы состояния** возвращает `revoked` в адаптере спейса (§4.2) — не
конфигурация прав, а доменный код, потому что для них нужен запрос в БД. Отнимать
права они могут, добавлять — никогда:

| Состояние | Эффект |
|---|---|
| `Project.status = Archived` | снимаются все `*.edit` / `*.manage` / `*.create` |
| `TeamMemberStatus = Applicant/Rejected/Fired` | `none` — заявка не членство (§2.2) |
| `EventMemberStatus = Pending/Rejected/Canceled` | `none` |
| `CourseStudentStatus = Blocked/Expelled` | `none` |
| space `dev` в production | `none` до проверки роли |

Супер-админ (§2.1) не подчиняется этой таблице — иначе архивный проект нельзя
было бы разархивировать. Такие действия помечаются в audit-log как
`superadmin_override`.

## 8. Legacy

### Адаптеры членства (временные)

`resolveRole` в адаптере (§4.2) — единственное место, где остаётся знание про
`TeamMember` / `EventMember` / `CourseGroupStudent`:

| Домен | Отображение в роль |
|---|---|
| `Project.authorId`, `TeamMemberStatus.Founder` | `owner` |
| `TeamMemberStatus.Hired` | `member` |
| `Event.createdById` | `owner`; `EventMemberStatus.Approved` → `member`, остальные статусы → `none` |
| `Course.createdById` | `owner`; `CourseStudentStatus.Enrolled/Finished` → `member` |
| `User.onboardingDone` | `hub`: `member`, иначе `guest` |

После бэкфилла в `SpaceMember` `resolveRole` из адаптеров удаляется, домены
пишут членство через общий сервис: `joinSpace`, `inviteToSpace`,
`deleteSpaceMembership` (§5.1).

### Текущие `UserRole`

| Значение | Решение |
|---|---|
| `Guest`, `Member` | Оставляем — это роль в **хабе** (до/после онбординга) |
| `Admin` | Переезжает в членство: `SpaceMember(hub, "default", admin)` — это доступ к админке платформы, но **не** к чужим спейсам. Тем, кому нужно заходить внутрь, ставится `User.isSuperAdmin = true`. После бэкфилла значение убирается из enum |
| `Author` | **Устарело.** «Есть проект» выводится из `Project.authorId` / `Founder`. Перестаём писать, потом убираем из enum |
| `Mentor` | **Устарело как роль доступа.** Менторство — это `Speciality` и `EventMember.mentors`. Сейчас используется только в role-гейте `/live/room/reports` в [proxy.ts](../src/proxy.ts) — заменить на право `hub.live_room.use` |

Удаление значений из enum — последним шагом, когда в коде не осталось проверок
(миграция во внешнем пакете).

## 9. Порядок внедрения

Схема Prisma живёт во внешнем пакете `@gdhub-io/gdhub-prisma`, миграции и сид —
там же (`bun run db:deploy`, `db:seed`). Поэтому каждый шаг помечен, где он
делается: **app** — этот репозиторий, **prisma** — задание для пакета
(оформляется как [gdhub-prisma-workflow-tasks.md](gdhub-prisma-workflow-tasks.md)).

| # | Шаг | Где |
|---|---|---|
| 1 | `ACTIONS`, дефолты по классам действий, `defineSpace` и описатели шести спейсов | app |
| 1 | Модель `SpaceRolePermission` + enum `SpaceRole` + миграция | **prisma** |
| 1 | Сид матрицы, сгенерированный из реестра (идемпотентный: добавляет новые права, помечает исчезнувшие) | app → отдаём в **prisma** как данные сида |
| 2 | Поле `User.isSuperAdmin` + миграция | **prisma** |
| 2 | `getSpaceAccess` / `can` / `createSpaceGate`, адаптеры спейсов, байпас супер-админа | app |
| 3 | `withSpaceGuard` и перевод API — по спейсу за раз, начиная с `project` | app |
| 4 | `SpaceAccessProvider` / `useSpaceAccess()`, замена `isProjectAuthor` и `hasRole(...)` на `can(...)`, меню из прав | app |
| 5 | Админка матрицы: сетка `spaceType × role × permission`, запись в audit-log | app |
| 6 | Модели `SpaceMember`, `SpaceInvitation` + миграция | **prisma** |
| 6 | Миграция данных: `TeamMember` / `EventMember` / `CourseGroupStudent` → `SpaceMember`; `UserRole.Admin` → `SpaceMember(hub, "default", admin)`; `onboardingDone` → `member` | **prisma** (рядом со схемой) |
| 6 | Сервис членства (`joinSpace`, `inviteToSpace`, `deleteSpaceMembership`), удаление `resolveRole` из адаптеров | app |
| 7 | `hub.live_room.use` вместо role-гейта в `proxy.ts` | app |
| 7 | Удаление `Author` / `Mentor` / `Admin` из enum `UserRole` | **prisma** |

Порядок внутри шага важен: сначала миграция в пакете, потом обновление версии
`@gdhub-io/gdhub-prisma` в `package.json` и `bun run db:generate`, и только затем
код, который на неё опирается.

**Что уходит в пакет — одним списком.** Удобно оформить как одно задание с
несколькими этапами, чтобы не гонять релиз пакета на каждый шаг:

```prisma
enum SpaceRole { Owner Admin Member Guest }

model SpaceRolePermission { … }   // шаг 1
model SpaceMember        { … }    // шаг 6
model SpaceInvitation    { … }    // шаг 6

model User {
  isSuperAdmin Boolean @default(false)   // шаг 2
  // шаг 7: убрать Author / Mentor / Admin из UserRole
}
```

Плюс скрипты миграции данных (шаг 6) и сид матрицы прав (шаг 1). Релизов пакета
получается четыре — по числу помеченных строк в таблице; их можно слить в один,
если готовы подождать со стартом.

**Что можно делать параллельно.** Шаги 1–5 не требуют `SpaceMember`: роль на это
время берётся из адаптеров, читающих доменные таблицы. То есть пока пакет
выпускает модели членства, в app уже работают права, гейты и админка матрицы.

Шаги 1–4 дают рабочую систему: права настраиваются в БД, проверки в одном месте,
UI перестаёт решать вопросы доступа.

## 10. Чек-лист «добавить новый space»

Проверка универсальности — этого списка должно быть достаточно:

1. Создать `src/config/spaces/<name>.ts` с `defineSpace({ type, features, overrides?, inheritRoleFrom? })` — чистая конфигурация, без Prisma.
2. Добавить его в `registerSpaces([...])`.
3. Прогнать сид матрицы — новые строки `SpaceRolePermission` появятся из features и дефолтов, при необходимости поправить галочки в админке.
4. Роуты: `src/app/(app)/(spaces)/<name>/…` + `layout.tsx` в одну строку — `export default createSpaceGate("<name>", { param: "…" })`.
5. При создании сущности — `joinSpace({ type, id, userId, role: "owner" })`, при
   удалении — `deleteSpaceMembership(type, id)` в той же транзакции (§5.1).
6. Адаптер (`registerSpaceAdapter`) — только если у спейса есть состояния,
   отнимающие права. Новым спейсам не нужен: роль берётся из `SpaceMember`.

Ничего из перечисленного не требует правок в `getSpaceAccess`, `withSpaceGuard`,
`SpaceAccessProvider`, `SpaceHeader` и в админке матрицы — features нового спейса
объявляются в его же файле. Общий код правится ровно в одном случае: спейсу
понадобилось действие, которого нет в словаре `ACTIONS` (§3.3) — тогда оно
добавляется туда и получает класс в таблице дефолтов (§3.5).

## 11. Карта роутов

Полный список страниц (`page.tsx`) с привязкой к спейсу, минимальной ролью и
правом. Вход в спейс проверяет `layout.tsx` — по роли, не по праву (§3.1);
право проверяется в самой странице и в API. Группы `(app)`, `(spaces)`,
`(public)`, `(auth)`, `(landing)` в URL не попадают.

Колонка «мин. роль» — это роль, при которой страница вообще что-то показывает
после применения дефолтов из §3.5; она не заменяет проверку права, а помогает
читать таблицу.

### Вне системы доступов — публичное и авторизация

Гейтов нет, `proxy.ts` эти пути не перехватывает.

| Роут | Комментарий |
|---|---|
| `/` | лендинг, тёмная тема |
| `/blog`, `/blog/[slug]` | блог |
| `/projects`, `/project/[projectSlug]` | витрина проектов + публичная страница |
| `/events`, `/event/[slug]` | витрина эвентов + публичная страница |
| `/course/[slug]` | публичная страница курса |
| `/jobs`, `/job/[vacancyId]` | вакансии |
| `/expert/[specialityId]` | публичный профиль эксперта |
| `/devlog/[projectReportId]` | публичный девлог-пост |
| `/verify`, `/verify/[number]` | проверка сертификата |
| `/terms`, `/privacy-policy`, `/cookie-policy`, `/refund-policy`, `/legal-details`, `/project-requirements` | юридические страницы |
| `/signin`, `/registration` | вход и регистрация |
| `/registration/onboarding` | нужна сессия; пройденный онбординг → редирект на `/hub` |
| `/invite/[token]` | доступ по токену приглашения, роль выдаётся после принятия |

### `(app)` — общая часть приложения

Гейт `(app)/layout.tsx`: `requireSession()`. Всё ниже требует сессии.

| Роут | Space | Мин. роль | Право |
|---|---|---|---|
| `/profile` | hub | member | — (свой профиль) |
| `/user/settings`, `/user/settings/[item]` | hub | member | — (свой аккаунт) |
| `/live/room/reports` | hub | **admin** | `hub.live_room.use` / `.manage` — preview, участникам по умолчанию не выдано (§3.7) |

`[item]`: `general`, `specialities`, `mentorship`, `resources`, `connections`,
`interests`, `payments`, `danger`.

`/live/room/reports` — живой видеочат в статусе preview: владелец зовёт
конкретных людей, ссылки в интерфейсе нет. Права описаны (`use` — участвовать,
`manage` — вести эфир), но `use` участникам хаба **не выдано**; подробности и
план перевода в отдельный спейс — §3.7.

### `(spaces)/hub` — витрины сообщества

| Роут | Мин. роль | Право |
|---|---|---|
| `/hub` | guest | — (достаточно роли) |
| `/hub/projects` | guest | `hub.projects.view` |
| `/hub/events` | guest | `hub.events.view` |
| `/hub/courses` | guest | `hub.courses.view` |
| `/hub/courses/[slug]` | guest | `hub.courses.view` |
| `/hub/jobs` | guest | `hub.jobs.view` |
| `/hub/experts` | guest | `hub.experts.view` |
| `/hub/members` | **member** | `hub.talent_pool.view` |

Действия внутри витрин (отклик на вакансию, запрос к эксперту, создание
проекта/эвента/курса, чат) требуют `member`: `hub.jobs.apply`,
`hub.experts.request`, `hub.projects.create`, `hub.events.create`,
`hub.courses.create`, `hub.chat.use`.

### `(spaces)/user` — личные списки

Роль — из хаба, выборка ограничена юзером (скоуп `own`), отдельного гейта у этих
страниц нет.

| Роут | Space | Мин. роль | Право |
|---|---|---|---|
| `/user/courses` | hub | member | `hub.courses.view` (own) |
| `/user/events` | hub | member | `hub.events.view` (own) |
| `/user/advice-requests` | hub | member | `hub.experts.request` (own) |

### `(spaces)/user/project/[slug]` — спейс проекта

Гейт: `createSpaceGate("project", { param: "slug" })` (сегодня — `resolveSpaceAccess`), `none` → 404.

| Роут | Мин. роль | Право |
|---|---|---|
| `/user/project/[slug]` | member | `project.workflow.view` |
| `/user/project/[slug]/workflow` | member | `project.workflow.view` |
| `/user/project/[slug]/devlog` | member¹ | `project.devlog.view`; создание — `project.devlog.create`, публикация — `project.devlog.publish` (admin) |
| `/user/project/[slug]/team` | member | `project.members.view`; приглашение/исключение — `project.members.invite` / `.remove` (admin) |
| `/user/project/[slug]/open-positions` | admin | `project.vacancies.manage`, отбор кандидатов — `project.vacancies.review` |
| `/user/project/[slug]/artifacts` | member | `project.artifacts.view`; загрузка — `project.artifacts.manage` (admin) |
| `/user/project/[slug]/settings/[[...item]]` | admin | `project.info.edit` |
| └ `settings/danger` | **owner** | `project.lifecycle.archive` / `.delete` |

¹ По матрице `project.devlog.view` открыт и гостю, но роль `guest` в проекте
сегодня никому не выдаётся: в формах приглашения выбора роли нет (§2.2). Кандидат
со статусом `Applicant` внутрь тоже не попадает — он работает с публичной
страницей и вакансиями в хабе. Вход в спейс правом не закрыт (§3.1) — 404 отдаёт
только `none`.

Доли (equity) отдельной страницы не имеют, живут внутри команды и настроек:
`project.equity.view` (member, скоуп `own`), `project.equity.manage` (admin).

Архивный проект: `revoked` в адаптере снимает все `*.edit` / `*.manage` /
`*.create`, страницы остаются доступны на чтение.

### `(spaces)/user/event/[eventId]` — спейс эвента

Гейт: `createSpaceGate("event", { param: "eventId" })`, `none` → 404.

| Роут | Мин. роль | Право |
|---|---|---|
| `/user/event/[eventId]` | member | — (достаточно роли) |
| `/user/event/[eventId]/schedule` | member¹ | `event.schedule.view`; правка — `event.schedule.edit` (admin) |
| `/user/event/[eventId]/content` | member | `event.content.view`; правка — `event.content.edit` (admin) |
| `/user/event/[eventId]/members` | member | `event.members.view`; модерация заявок — `event.members.manage` (admin) |
| `/user/event/[eventId]/settings/[[...item]]` | admin | `event.info.edit` |
| └ `settings/danger` | **owner** | `event.lifecycle.delete` |

¹ Как и в проекте: по матрице расписание открыто гостю, но роль `guest`
сегодня не выдаётся (§2.2). Заявка со статусом `Pending` внутрь не пускает.

Публикация/снятие с публикации — `event.lifecycle.publish` (admin), кнопки живут
в шапке спейса. Выдача сертификатов — `event.certificates.issue` (admin).

### `(spaces)/user/course/[courseId]` — спейс курса

Гейт: `createSpaceGate("course", { param: "courseId" })`, `none` → 404. Страница пока заглушка.

| Роут | Мин. роль | Право |
|---|---|---|
| `/user/course/[courseId]` | member | — (достаточно роли) |

Планируемые подстраницы: `curriculum` (`course.curriculum.view` / `.edit`),
`students` и `groups` — **список видят и студенты** (`.view` у `member`:
однокурсники друг о друге знают), управление составом за admin (`.manage`);
`classroom` (`course.classroom.access` — студенту, `.teach` —
преподавателю-admin), `settings` (`course.info.edit`), публикация —
`course.lifecycle.publish` (owner).

### `(spaces)/admin` — спейс администрирования

Гейт: роль в хабе ≥ `admin` (`inheritRoleFrom`), иначе 404. Позже — узкие роли
(маркетолог, HR) через `SpaceCustomRole`, §5.6.

| Роут | Право | Кому пригодится узкая роль |
|---|---|---|
| `/admin/users` | `admin.users.view` / `.manage` | HR |
| `/admin/posts`, `/admin/post/[id]` | `admin.posts.view` / `.manage` | маркетолог |
| `/admin/devlog-posts` | `admin.devlog_posts.view` / `.manage` | маркетолог |
| `/admin/workflows`, `/admin/workflow/[id]`, `/admin/project-workflow/[id]` | `admin.workflow.view` / `.manage` | — |
| `/admin/audit-logs` | `admin.audit_logs.view` | — |

### `(spaces)/dev` — инструменты разработки

Гейт: `NODE_ENV !== "production"`, затем роль ≥ `admin` в хабе.

| Роут | Право |
|---|---|
| `/dev/ai-validation`, `/dev/push-test`, `/dev/telegram-test`, `/dev/test-seo`, `/dev/ui-test` | `dev.tools.use` |

### Известное расхождение: гость сегодня недостижим

`proxy.ts` форсит онбординг: пользователь без `onboardingDone` уводится на
`/registration/onboarding` с любой страницы приложения. То есть роль `hub.guest`
описана, но до витрин хаба гость фактически не доходит — он либо ещё не
зарегистрирован (и видит публичные страницы из первой таблицы), либо уже
`member`. Гостевые права начнут работать, когда онбординг перестанет быть
обязательным для входа в хаб; до тех пор колонка `guest` в матрице хаба —
задел, а не текущее поведение.
