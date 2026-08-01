# Задание для пакета `@gdhub-io/gdhub-prisma`: производительность запросов

Актуально для `2.0.0-beta.38`. Профилирование со стороны приложения показало, что
основное время страниц проектов, ленты девлогов и любого авторизованного запроса
уходит в БД. Часть исправлена в приложении (батчинг аплодисментов, кэш JWT,
пагинация ленты), но три вещи чинятся только внутри пакета: расширения
`getApplauseCount` / `getApplauseSummary`, сырой запрос
`getProjectsOrderedByActivity` и индексы.

Порядок разделов = порядок приоритета.

---

## 1. Батч-методы для аплодисментов

### Проблема

`getProjectApplauseSummary` (`src/extensions/project.ts`) делает **три** `COUNT`
на один проект:

```ts
const [total, direct, reports] = await Promise.all([
  client.applause.count({ where: { activity: { projectId } } }),
  client.applause.count({ where: { activity: { projectId, type: Project } } }),
  client.applause.count({ where: { activity: { projectId, type: ProjectReport } } }),
]);
```

`project.getApplauseCount()` вызывает её целиком ради одного `total`. В списках
(лента проектов, витрина, публичная страница) это `3 × N` запросов на страницу.

### Что сделать

**1.1.** Свести `getProjectApplauseSummary` к одному запросу:

```ts
const getProjectApplauseSummary = async (client, projectId) => {
  const rows = await client.$queryRaw<{ type: string; count: number }[]>`
    SELECT aa."type"::text AS type, CAST(COUNT(a.id) AS INTEGER) AS count
    FROM "ApplauseActivity" aa
    LEFT JOIN "Applause" a ON a."activityId" = aa.id
    WHERE aa."projectId" = ${projectId}
    GROUP BY aa."type"
  `;

  const direct = rows.find((r) => r.type === "Project")?.count ?? 0;
  const reports = rows.find((r) => r.type === "ProjectReport")?.count ?? 0;

  return { total: direct + reports, direct, reports };
};
```

**1.2.** Добавить батч-методы — они и есть главная цель этого раздела:

```ts
// project.getApplauseCounts({ projectIds }) -> Map<projectId, total>
async getApplauseCounts({ projectIds }: { projectIds: string[] }) {
  if (!projectIds.length) return new Map<string, number>();

  const rows = await client.$queryRaw<{ projectId: string; total: number }[]>`
    SELECT aa."projectId", CAST(COUNT(a.id) AS INTEGER) AS total
    FROM "ApplauseActivity" aa
    LEFT JOIN "Applause" a ON a."activityId" = aa.id
    WHERE aa."projectId" = ANY(${projectIds}::text[])
    GROUP BY aa."projectId"
  `;

  return new Map(rows.map((row) => [row.projectId, row.total]));
}

// projectReport.getApplauseCounts({ projectReportIds }) -> Map<reportId, total>
async getApplauseCounts({ projectReportIds }: { projectReportIds: string[] }) {
  if (!projectReportIds.length) return new Map<string, number>();

  const rows = await client.$queryRaw<{ projectReportId: string; total: number }[]>`
    SELECT aa."projectReportId", CAST(COUNT(a.id) AS INTEGER) AS total
    FROM "ApplauseActivity" aa
    LEFT JOIN "Applause" a ON a."activityId" = aa.id
    WHERE aa."type" = 'ProjectReport'
      AND aa."projectReportId" = ANY(${projectReportIds}::text[])
    GROUP BY aa."projectReportId"
  `;

  return new Map(rows.map((row) => [row.projectReportId, row.total]));
}
```

Семантика `total` должна совпасть с текущей: прямые аплодисменты проекту **плюс**
аплодисменты его девлог-постам.

**1.3.** Индекс под эти запросы (`prisma/schema.prisma`):

```prisma
model ApplauseActivity {
  // ...
  @@index([projectId, type])   // заменяет @@index([projectId])
  @@index([projectReportId])
}
```

`Applause.@@index([activityId])` уже есть — его хватает для джойна.

### Что удалится в приложении

`src/services/prisma/applause.ts` + `tests/applause-counts.test.ts` — временный
локальный хелпер с ровно этой логикой. После выхода пакета вызовы в
`api/projects`, `api/projects/published`, `api/devlogs` и `services/prisma/queries.ts`
переключаются на методы пакета.

---

## 2. `getProjectsOrderedByActivity` — переписать запрос

### Проблема

Самый дорогой запрос платформы: лендинг, `/projects`, `/api/projects`,
`/api/projects/published`. Сейчас (`src/extensions/project.ts`):

1. Первый CTE `project_activity` считает метрики по **всей** таблице `Project`
   с `LEFT JOIN "ProjectReport"` и `GROUP BY p.id` — фильтры (`status`, `where`,
   видимость шага) применяются только в финальном `SELECT`. То есть база
   агрегирует все проекты, включая архивные и отфильтрованные, чтобы потом их
   выбросить.
2. Второй CTE `project_scores` **ещё раз** сканирует `Project` и джойнит
   результат первого.
3. `COUNT(DISTINCT pr.id)` вынуждает сортировку/хеш там, где достаточно
   `COUNT(pr.id)`: фан-аута нет, джойн один.
4. `recentProjectChangeCount` — это `COUNT(DISTINCT CASE WHEN p."updatedAt" > ...
   THEN p.id END)` при `GROUP BY p.id`, то есть всегда 0 или 1. Считается
   агрегатом там, где это обычный `CASE`.
5. `ps.id IN (${Prisma.join(filteredProjectIds)})` — по одному bind-параметру на
   проект. При росте базы упрётся в лимит Postgres (65535) и в любом случае
   раздувает план.
6. Отдельный `client.project.findMany` перед сырым запросом ради списка id —
   лишний round-trip, фильтр можно выразить прямо в SQL для частых случаев.

### Что сделать

Один проход: сначала отбор кандидатов (с фильтрами!), потом агрегация только по
ним.

```sql
WITH candidates AS (
  SELECT p.*, pw.id AS "workflowId", pw.title AS "workflowTitle",
         pws.id AS "stepId", pws.name AS "stepName",
         pws."order" AS "stepOrder", pws.done AS "stepDone"
  FROM "Project" p
  LEFT JOIN "ProjectWorkflow" pw ON pw."projectId" = p.id
  LEFT JOIN "ProjectWorkflowStep" pws ON pws.id = pw."currentStepId"
  WHERE p.status::text = ANY($1::text[])
    AND (pws."order" > 0 OR pws."order" IS NULL)
    AND ($2::text[] IS NULL OR p.id = ANY($2::text[]))
),
activity AS (
  SELECT c.id AS "projectId",
         CAST(COUNT(pr.id) AS INTEGER) AS "reportCount",
         MAX(pr."publishedAt") AS "lastPostAt",
         MIN(pr."publishedAt") AS "firstPostAt",
         CAST(COUNT(pr.id) FILTER (
           WHERE pr."publishedAt" > NOW() - INTERVAL '1 month'
         ) AS INTEGER) AS "recentProjectReportCount"
  FROM candidates c
  LEFT JOIN "ProjectReport" pr ON pr."projectId" = c.id
  GROUP BY c.id
)
SELECT c.*, ...
FROM candidates c
LEFT JOIN activity a ON a."projectId" = c.id
LEFT JOIN "User" u ON u.id = c."authorId"
ORDER BY "activityScore" DESC NULLS LAST, "lastPostAt" DESC NULLS LAST
LIMIT $3
```

Ключевое:

- фильтры уходят **в `candidates`**, агрегируется только отобранное;
- `Project` сканируется один раз вместо двух;
- `COUNT(DISTINCT ...)` → `COUNT(...) FILTER (WHERE ...)`;
- `recentProjectChangeCount` — обычный `CASE` в финальном `SELECT`;
- `IN (...)` → `= ANY($2::text[])`, один параметр вместо N;
- `json_build_object` для `workflow`/`author` собирается из уже сделанных
  джойнов, дублировать их не нужно.

**Контракт не меняем**: набор полей `ProjectWithActivity` (`reportCount`,
`lastPostAt`, `firstPostAt`, `recentProjectReportCount`,
`recentProjectChangeCount`, `activityScore`, `isInactive`, `author`, `workflow`),
формула скора и порядок сортировки остаются прежними — приложение на них
завязано.

Заодно стоит вынести в комментарий бизнес-правило `pws."order" > 0 OR pws."order"
IS NULL` (сейчас оно ничем не объяснено) и покрыть функцию тестом на
`docker-prisma.integration.test.ts`-подобном стенде: порядок выдачи не должен
измениться.

---

## 3. Денормализация активности (следующий шаг после п. 2)

Даже переписанный запрос агрегирует `ProjectReport` на каждый показ страницы,
хотя данные меняются при публикации поста. Предлагаю вынести метрики в колонки.

### 3.1. Схема

```prisma
model Project {
  // ...
  activityScore    Float     @default(0)
  reportCount      Int       @default(0)
  lastPostAt       DateTime?
  firstPostAt      DateTime?
  /// Denormalized `workflow.currentStep.order` — feeds filter on it constantly.
  currentStepOrder Int?

  @@index([status, activityScore(sort: Desc), lastPostAt(sort: Desc)])
  @@index([status, currentStepOrder])
}
```

`currentStepOrder` убирает вложенный подзапрос из фильтра ленты — приложение
сейчас фильтрует через `workflow.is.currentStep.is.order >= N`
(`feedVisibleProjectFilter`, `MINIMUM_STORE_STAGE_ORDER`).

### 3.2. Пересчёт

- метод `project.recomputeActivity({ projectIds? })` — тот же SQL, что в п. 2, но
  как `UPDATE ... FROM (SELECT ...)`;
- вызывать из `query`-расширений на `projectReport.create/delete` и при смене
  шага workflow (там же, где обновляется `currentStepId`);
- полный пересчёт по расписанию (в приложении уже есть cron
  `project-status-maintenance`) — как страховка от рассинхрона.

После этого `getProjectsOrderedByActivity` превращается в обычный
`findMany` + `ORDER BY activityScore DESC` по индексу, а `take` наконец работает
как настоящий `LIMIT` без предварительной агрегации.

Миграция: колонки + бэкфилл текущими значениями одним `UPDATE` из формулы п. 2.

---

## 4. `ProjectReport.isSystem` вместо сравнения по тексту

Сейчас приложение отсекает сгенерированные посты так
(`src/config/devlog.ts`):

```ts
export const nonSystemDevlogFilter = {
  content: { notIn: ["Registration of the project on the service"] },
};
```

Сравнение по полю `content` (text) в глобальной ленте, которая ещё и сортируется
по `publishedAt`. Плюс правило ломается от любой правки формулировки или
локализации.

```prisma
model ProjectReport {
  // ...
  isSystem Boolean @default(false)

  @@index([isSystem, publishedAt(sort: Desc)])
}
```

Миграция: бэкфилл `UPDATE "ProjectReport" SET "isSystem" = true WHERE content IN
(...)`, дальше системные посты создаются с флагом (там, где пакет сам их создаёт
в `project.create`).

---

## 5. Сводка изменений в схеме

| Модель | Изменение | Раздел |
|--------|-----------|--------|
| `ApplauseActivity` | `@@index([projectId, type])` вместо `@@index([projectId])` | 1.3 |
| `Project` | `activityScore`, `reportCount`, `lastPostAt`, `firstPostAt`, `currentStepOrder` + 2 индекса | 3.1 |
| `ProjectReport` | `isSystem Boolean @default(false)` + индекс | 4 |

## 6. Новое в публичном API пакета

| Метод | Возвращает |
|-------|-----------|
| `prisma.project.getApplauseCounts({ projectIds })` | `Map<projectId, number>` |
| `prisma.projectReport.getApplauseCounts({ projectReportIds })` | `Map<reportId, number>` |
| `prisma.project.recomputeActivity({ projectIds? })` | `void` (п. 3) |

Существующие `getApplauseCount` / `getApplauseSummary` / `getProjectsOrderedByActivity`
сохраняют сигнатуру и семантику — ломающих изменений в этом задании нет.

## 7. Замечание про логирование

Пакет принимает только `log?: Prisma.LogLevel[]` (stdout), поэтому пороговое
логирование медленных запросов пришлось делать в приложении через
client-extension `$allOperations` (`src/services/prisma/index.ts`). Если пакету
это пригодится — стоит пробросить в опции `emit: "event"`-вариант конфигурации,
чтобы потребитель мог подписаться на `$on("query")`.
