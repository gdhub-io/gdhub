# Задание для пакета `@gdhub-io/gdhub-prisma`: условия и привязка задач workflow

Внести изменения в схему Prisma, типы и сид. Цель: задачи workflow несут **условие**
авто-проверки (`condition`), а девлог-посты привязываются к шагу.

## 1. Схема Prisma (`prisma/schema.prisma`)

### 1.1. `ProjectWorkflowTask` — поле условия

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

  /// [WorkflowTaskCondition]
  condition   Json?

  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  @@index([stepId, order])
}
```

### 1.2. `ProjectReport` — привязка к шагу

```prisma
model ProjectReport {
  // ...существующие поля...
  stepId String?
  step   ProjectWorkflowStep? @relation(fields: [stepId], references: [id])

  @@index([stepId])
}
```

Добавить обратную связь в `ProjectWorkflowStep`:

```prisma
model ProjectWorkflowStep {
  // ...существующие поля...
  reports ProjectReport[]
}
```

## 2. Тип условия (`types.ts`, аннотация `WorkflowTaskCondition`)

`condition` хранится как JSON заданной формы — **discriminated union по `source`**.
`min` — целое ≥ 1 (по умолчанию 1). Enum-значения берутся из соответствующих enum'ов Prisma.

```ts
export type WorkflowTaskCondition =
  | { source: "project_fields"; fields: Array<
        "name" | "description" | "genre" | "platform" | "setting" | "visualStyle"
      | "audition" | "conceptLink" | "gddLink" | "pitchdeckLink" | "videoLink"
      | "coverImage" | "coreMechanics"> }
  | { source: "devlog_posts"; min: number; scope?: "project" | "step" }
  | { source: "vacancies"; min: number; scope?: "project" | "step"; status?: TeamVacancyStatus; directionId?: string }
  | { source: "team_members"; min: number; scope?: "project" | "step"; status?: TeamMemberStatus }
  | { source: "investors"; min: number }
  | { source: "documents"; min: number; type?: TeamDocumentType }
  | { source: "advice_requests"; min: number; status?: AdviceRequestStatus }
  | { source: "estimations"; min: number }
  | { source: "equity_allocations"; min: number }
  | { source: "applause"; min: number; type?: ApplauseActivityType };
```

Также добавить `condition?: WorkflowTaskCondition` в JSON-тип задач шаблона
(`WorkflowSchema.steps[].tasks[]`), чтобы дефолтные задачи несли условие.

## 3. Сид (`src/seeds/workflow-schema.ts`)

### 3.1. Наполнить `tasks` в шаблоне «default»

Сейчас у всех шагов `tasks: []`. Заполнить по таблице (§5). Каждая задача:
`{ name, description, required, condition }`. Ярлык — `description`.

### 3.2. Исправить создание `ProjectWorkflowTask`

Было:

```ts
tasks: { create: step.tasks.map((task) => ({ name: task.name, description: task.description })) }
```

Стало (передавать `description`, `required`, `condition`; поля `name` в модели нет):

```ts
tasks: {
  create: step.tasks.map((task) => ({
    description: task.description,
    required: Boolean(task.required),
    condition: task.condition ?? undefined,
  })),
}
```

### 3.3. Backfill задач существующих проектов

В `seedDefaultWorkflow` добавить проход: для `ProjectWorkflow`, у которых шаги без задач,
создать задачи из шаблона (сопоставление по порядку/имени шага).

## 4. Data-миграция: `ProjectReport.stepId` для существующих постов

Проставить каждому существующему `ProjectReport.stepId` = `currentStepId` его проекта
(`project.workflow.currentStepId`). Скрипт/миграция.

## 5. Дефолтные задачи (черновик — откорректировать)

Ярлык = `description`. Шаги Introduction и Project Completion — без задач.

| Шаг | `description` | required | `condition` |
|---|---|---|---|
| Ideation | Describe your game idea in the project description | true | `{source:"project_fields", fields:["description"]}` |
| Ideation | Define the core concept and genre | true | `{source:"project_fields", fields:["genre","setting"]}` |
| Ideation | Post your first devlog about the idea | false | `{source:"devlog_posts", min:1}` |
| Concepting | Prepare a concept document | true | `{source:"documents", min:1, type:"Concept"}` |
| Concepting | Add a GDD / concept link | true | `{source:"project_fields", fields:["conceptLink"]}` |
| Concepting | Assemble your core team | false | `{source:"team_members", min:2, status:"Hired"}` |
| Concepting | Set up initial equity allocations | false | `{source:"equity_allocations", min:1}` |
| Prototyping | Publish a devlog about the prototype | true | `{source:"devlog_posts", min:1, scope:"step"}` |
| Prototyping | Add a build/video link | true | `{source:"project_fields", fields:["videoLink"]}` |
| Prototyping | Open a vacancy if you need help | false | `{source:"vacancies", min:1, status:"Published"}` |
| Preparing a demo version | Upload a GDD document | true | `{source:"documents", min:1, type:"GDD"}` |
| Preparing a demo version | Add pitch deck | true | `{source:"project_fields", fields:["pitchdeckLink"]}` |
| Taking and analyzing metrics | Collect community applause | false | `{source:"applause", min:10}` |
| Taking and analyzing metrics | Request expert advice | false | `{source:"advice_requests", min:1}` |
| Preparing a release version | Finalize equity allocations | true | `{source:"equity_allocations", min:2}` |
| Preparing a release version | Sign the co-development agreement (JDA) | true | `{source:"documents", min:1, type:"JDA"}` |
| Support | Keep publishing devlogs | false | `{source:"devlog_posts", min:1, scope:"step"}` |
