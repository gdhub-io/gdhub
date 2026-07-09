# Промпт для внешнего пакета `@gdhub-io/gdhub-prisma` — условия задач workflow

Скопируй этот файл как задание для агента/разработчика, работающего в репозитории
`@gdhub-io/gdhub-prisma`. Приложение (`gdhub/app`) уже готово к этим полям: в нём есть
Zod-схема условия и эвалюатор (`src/schemas/workflowTaskCondition.ts`,
`src/services/workflow/evaluateTaskCondition.ts`). Форма JSON условия ниже **должна
совпадать** с этой схемой.

## 0. Разделение ответственности

Не всё из этого файла — в пакет. Чётко:

**Делается в пакете `@gdhub-io/gdhub-prisma` (схема + сид + миграции данных):**
- §1 — поле `ProjectWorkflowTask.condition Json?` (+ аннотация типа в `types.ts`).
- §2a (схема) — поле `ProjectReport.stepId` + relation + index + обратная связь в `ProjectWorkflowStep`.
- §3 — сид: наполнить дефолтные задачи, исправить create (`description`+`required`+`condition`),
  backfill задач для существующих `ProjectWorkflow`.
- Data-миграция: проставить `ProjectReport.stepId` существующим постам (их текущим шагом).

**Делается в этом проекте `gdhub/app` (эндпоинты/логика) — НЕ в пакете:**
- §2 (форма условия) — уже реализована здесь (`src/schemas/workflowTaskCondition.ts` +
  эвалюатор). Пакет только хранит JSON, валидировать не нужно.
- Проставлять `stepId = currentStepId` при создании поста — эндпоинт девлога
  (`src/app/api/user/project/report/route.ts` и связанные).
- Пересчёт и персист `done` в `GET /api/user/project/workflow` и `PUT /api/project/move`.
- Персист `condition` при сохранении задач в `PUT /api/admin/project-workflow/[id]`
  + конструктор условия в admin-редакторе.
- Переключение эвалюатора `devlog_posts` на фильтр `stepId`.
- i18n-ключи.

Ниже — детали для пакетной части (§1–§4). §5 — что доделает приложение.

## 1. Изменение схемы Prisma

В модель `ProjectWorkflowTask` (`prisma/schema.prisma`) добавить поле для условия
авто-проверки. Задача считается выполненной платформой, если условие истинно по данным
проекта; пользователь галочки не ставит.

```prisma
model ProjectWorkflowTask {
  id          String              @id @default(cuid())
  order       Int
  description String?
  required    Boolean             @default(false)
  done        Boolean             @default(false)
  finishedAt  DateTime?
  stepId      String
  step        ProjectWorkflowStep @relation(fields: [stepId], references: [id], onDelete: Cascade)

  // NEW: verifiable completion condition (nullable = no auto-check / always pending).
  /// [WorkflowTaskCondition]
  condition   Json?

  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  @@index([stepId, order])
}
```

Замечания:
- `done` **остаётся** и хранится в БД (модель: «хранить `done` + пересчёт»). Приложение
  пересчитывает `done` по `condition` при открытии страницы workflow и при переходе между
  шагами, и обновляет поле. Пакету не нужен эвалюатор — только хранение `condition` и `done`.
- То же поле `condition` полезно продублировать в JSON-тип шаблона `WorkflowSchema.steps[].tasks[]`
  (см. `types.ts`, интерфейс `WorkflowStep`/задачи), чтобы дефолтные задачи несли условие.

## 2. Тип условия (аннотация `WorkflowTaskCondition`)

Условие — **discriminated union по полю `source`**. Значения `min` — целое ≥ 1 (по умолчанию 1).
Строковые enum-значения берутся из соответствующих enum'ов Prisma.

```ts
// Источники, скоуп и параметры (whitelist — произвольный where НЕ поддерживается):
type WorkflowTaskCondition =
  // Все перечисленные поля проекта заполнены (не пустые)
  | { source: "project_fields"; fields: Array<
        "name" | "description" | "genre" | "platform" | "setting" | "visualStyle"
      | "audition" | "conceptLink" | "gddLink" | "pitchdeckLink" | "videoLink"
      | "coverImage" | "coreMechanics"> }
  // Девлог-посты (ProjectReport) ≥ min. scope:"step" — только в текущем шаге.
  | { source: "devlog_posts"; min: number; scope?: "project" | "step" }
  // Вакансии команды (TeamVacancy) ≥ min. scope:"step" → по promiseStepId.
  | { source: "vacancies"; min: number; scope?: "project" | "step"; status?: TeamVacancyStatus; directionId?: string }
  // Участники команды (TeamMember) ≥ min. scope:"step" → по enteredProjectStepId.
  | { source: "team_members"; min: number; scope?: "project" | "step"; status?: TeamMemberStatus }
  // Инвесторы (TeamInvestor) ≥ min
  | { source: "investors"; min: number }
  // Документы команды (TeamDocument) ≥ min
  | { source: "documents"; min: number; type?: TeamDocumentType }
  // Запросы к эксперту (AdviceRequest) ≥ min
  | { source: "advice_requests"; min: number; status?: AdviceRequestStatus }
  // Оценки проекта (ProjectEstimation) ≥ min
  | { source: "estimations"; min: number }
  // Equity-аллокации (через ProjectEquity) ≥ min
  | { source: "equity_allocations"; min: number }
  // Аплодисменты (ApplauseActivity) ≥ min
  | { source: "applause"; min: number; type?: ApplauseActivityType };
```

Скоуп запросов (для справки, реализовано в приложении):
`project.reports`, `team.projectId` (vacancies/members/investors/documents),
`project.adviceRequests`, `project.estimations`, `equity.projectId`, `project.applauseActivities`.

## 2a. Привязка к шагу (`scope: "step"`)

Условие «сделать что-то в рамках текущего шага» использует привязку модели к шагу:

- **Вакансии** — уже есть `TeamVacancy.promiseStepId` → `promiseStepId = <currentStepId>`.
- **Участники** — уже есть `TeamMember.enteredProjectStepId` → `enteredProjectStepId = <currentStepId>`.
- **Девлог-посты** — у `ProjectReport` **привязки к шагу НЕТ**. До добавления поля (ниже)
  приложение временно считает `scope:"step"` по времени (`publishedAt >= step.plannedAt`).

**Необходимо добавить `ProjectReport.stepId`** — основной кейс постов: «пост написан в
рамках текущего шага».

```prisma
model ProjectReport {
  // ...
  stepId String?
  step   ProjectWorkflowStep? @relation(fields: [stepId], references: [id])
  @@index([stepId])
}
// + обратная связь в ProjectWorkflowStep: reports ProjectReport[]
```

- При создании поста проставлять `stepId = project.workflow.currentStepId`.
- **Backfill существующих постов**: проставить `stepId = currentStepId` их проекта
  (миграция/скрипт).
- После этого приложение переключит `devlog_posts scope:"step"` с фильтра по времени на
  точный `where: { stepId: currentStepId }` (одна строка в
  `src/services/workflow/evaluateTaskCondition.ts`).

## 3. Правка сида

Файл `src/seeds/workflow-schema.ts`.

### 3.1. Наполнить `tasks` в шаблоне «default»

Сейчас у всех шагов `tasks: []`. Заполнить по таблице ниже. Каждая задача:
`{ name, description, required, condition }`, где `description` — человекочитаемый ярлык
(в БД у задачи есть только `description`, поля `name`/`title` не хранятся).

### 3.2. Исправить создание `ProjectWorkflowTask`

Сейчас `seedDefaultWorkflow` создаёт задачи так:
```ts
tasks: { create: step.tasks.map((task) => ({ name: task.name, description: task.description })) }
```
Проблемы: передаётся `name` (в модели такого поля нет), теряются `required` и `condition`.
Исправить на:
```ts
tasks: {
  create: step.tasks.map((task) => ({
    description: task.description,
    required: Boolean(task.required),
    condition: task.condition ?? undefined,
  })),
}
```

### 3.3. Backfill (опционально)

Добавить в `seedDefaultWorkflow` догоняющий проход: для уже существующих `ProjectWorkflow`
с пустыми задачами шагов — создать задачи из шаблона (по имени шага/порядку), чтобы фича
включилась на текущих проектах, а не только на новых.

## 4. Черновой список дефолтных задач (ОТКОРРЕКТИРОВАТЬ ВРУЧНУЮ)

Ярлык = `description`. Шаги 0 (Introduction) и 8 (Project Completion) — переходные.
`condition` — предложение; правится под реальные требования.

| Шаг | Задача (`description`) | required | `condition` |
|---|---|---|---|
| Ideation | Describe your game idea in the project description | true | `{source:"project_fields", fields:["description"]}` |
| Ideation | Define the core concept and genre | true | `{source:"project_fields", fields:["genre","setting"]}` |
| Ideation | Post your first devlog about the idea | false | `{source:"devlog_posts", min:1}` |
| Concepting | Prepare a concept document | true | `{source:"documents", min:1, type:"Concept"}` |
| Concepting | Add a GDD / concept link | true | `{source:"project_fields", fields:["conceptLink"]}` |
| Concepting | Assemble your core team | false | `{source:"team_members", min:2, status:"Hired"}` |
| Concepting | Set up initial equity allocations | false | `{source:"equity_allocations", min:1}` |
| Prototyping | Publish devlogs about the prototype | true | `{source:"devlog_posts", min:1, scope:"step"}` |
| Prototyping | Add a build/video link | true | `{source:"project_fields", fields:["videoLink"]}` |
| Prototyping | Open a vacancy if you need help | false | `{source:"vacancies", min:1, status:"Published"}` |
| Preparing a demo version | Upload a GDD document | true | `{source:"documents", min:1, type:"GDD"}` |
| Preparing a demo version | Add pitch deck | true | `{source:"project_fields", fields:["pitchdeckLink"]}` |
| Taking and analyzing metrics | Collect community applause | false | `{source:"applause", min:10}` |
| Taking and analyzing metrics | Request expert advice | false | `{source:"advice_requests", min:1}` |
| Preparing a release version | Finalize equity allocations | true | `{source:"equity_allocations", min:2}` |
| Preparing a release version | Sign the co-development agreement (JDA) | true | `{source:"documents", min:1, type:"JDA"}` |
| Support | Keep publishing devlogs | false | `{source:"devlog_posts", min:1, scope:"step"}` |

## 5. Что сделает приложение после обновления пакета

- В `GET /api/user/project/workflow` и `PUT /api/project/move` вычислять `done` каждой задачи
  через `evaluateTaskCondition(task.condition, { projectId, stepStartedAt })`, персистить `done`.
- Гейт перехода: `next` разрешён, если все `required`-задачи текущего шага `done`
  (уже реализовано на клиенте и сервере, но по сохранённому `done`).
- Admin-редактор: конструктор `condition` (выбор `source` + whitelist-фильтры) — по
  `CONDITION_SOURCE_META` из `src/schemas/workflowTaskCondition.ts`.
