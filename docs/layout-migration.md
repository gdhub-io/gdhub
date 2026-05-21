# Layout & Metadata Migration Plan

> Переход от Pages-Router-style оборачивания (`<ProtectedLayout>{...}`)
> к идиоматичному App Router паттерну: route groups + `layout.tsx` + Metadata API.
> Это **доделка миграции на Next 16**, не новая фича.

## Зачем

Текущее состояние:
- 51 страница оборачивает свой контент в `<*Layout>` компонент вручную.
- Layout полностью размонтируется и монтируется при каждом переходе → меню моргает, состояние сбрасывается, в overlay лишние flicker'ы.
- Все layouts — `"use client"`, не могут использовать `auth()` на сервере, тянут сессию через `/api/auth/session` из клиента.
- SEO через `<NextSeo>` (next-seo) — параллельная подсистема с собственным дублированием `canonical` и `openGraph.url`.

После миграции:
- Layout живёт между переходами в пределах сегмента (persisted state).
- Layout — Server Component, тянет данные на сервере один раз (сессия, профиль проекта, и т.д.).
- SEO через нативный Metadata API (`export const metadata` / `generateMetadata`), one source of truth.
- Чистая иерархия `app/` совпадает с группировкой по доступу/контексту.

## Текущая инвентаризация

| Layout-компонент | Пропсы | Файлов-потребителей |
|---|---|---|
| `PublicLayout` | `title`, `seo`, `subTitle`, `subLine`, `backgroundImage`, `extra`, `extraPosition`, `extraGap`, `styles`, `ogImageType` | 16 |
| `ProtectedLayout` | `title`, `seo`, `breadcrumb` | 13 |
| `ProtectedProjectLayout` | `title`, `seo`, props на проект | 7 |
| `ProtectedEventLayout` | `title`, `seo`, props на событие | 4 |
| `AdminLayout` | только `children` | 8 |
| `EmptyLayout` | только `children` | 3 (2 страницы + 1 компонент) |
| `LandingLayout` | `className`, динамический импорт | 1 (`HomeClient`) |

7 файлов всё ещё используют `next-seo` (5 layouts + 1 страница + `config/seo.ts`).

## Целевая структура

```
src/app/
├── layout.tsx                          # root: html/body, Providers, setupDayjs, metadata defaults
├── page.tsx                            # / (HomeClient)
├── sitemap.ts
├── error.tsx
├── not-found.tsx
│
├── (public)/                           # PublicLayout (anonymous-OK)
│   ├── layout.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── events/page.tsx
│   ├── event/[slug]/page.tsx
│   ├── jobs/page.tsx
│   ├── job/[vacancyId]/page.tsx
│   ├── projects/page.tsx
│   ├── project/[projectSlug]/page.tsx
│   ├── expert/[specialityId]/page.tsx
│   ├── courses/[slug]/page.tsx
│   ├── devlog/[projectReportId]/page.tsx
│   ├── verify/page.tsx
│   ├── verify/[number]/page.tsx
│   ├── legal-details/page.tsx
│   ├── privacy-policy/page.tsx
│   └── cookie-policy/page.tsx
│
├── (auth)/                             # EmptyLayout (для логина/регистрации, без обвязки)
│   ├── layout.tsx
│   ├── signin/page.tsx
│   └── registration/page.tsx
│
├── (protected)/                        # любой авторизованный — auth() gate в layout
│   ├── layout.tsx                      # await auth() → redirect("/signin") если null
│   ├── hub/
│   │   ├── layout.tsx                  # доп. шапка hub если нужна (опционально)
│   │   ├── page.tsx
│   │   ├── docs/[[...slug]]/page.tsx
│   │   ├── members/page.tsx
│   │   ├── lectures/page.tsx
│   │   ├── events/                     # общий ProtectedLayout — отдельный hub-events layout
│   │   │   ├── page.tsx                # нужен ТОЛЬКО если появится своя шапка/фильтры
│   │   │   └── my/page.tsx
│   │   ├── projects/page.tsx
│   │   └── courses/
│   │       ├── page.tsx
│   │       ├── my/page.tsx
│   │       └── [slug]/page.tsx
│   ├── profile/                        # просмотр профиля — без settings
│   │   └── page.tsx
│   └── live/room/reports/page.tsx
│
├── (user)/                               # авторизованный + ownership на ресурс
│   ├── layout.tsx                      # await auth() → redirect; место для общей "My Workspace"
│   │                                   # обвязки в будущем. Сам по себе ownership НЕ проверяет
│   │                                   # — это делают вложенные [slug]/layout.tsx
│   └── my/                             # URL остаётся /my/...
│       │                               # (index-страницы /my/projects, /my/events,
│       │                               #  /my/courses пока НЕ создаются — списки
│       │                               #  "мои X" живут под /hub/X/my)
│       ├── settings/                   # бывший /profile/settings — личные настройки пользователя
│       │   ├── layout.tsx              # sider с пунктами настроек (persisted!)
│       │   └── [item]/page.tsx
│       ├── projects/
│       │   └── [slug]/
│       │       ├── layout.tsx          # ← UI текущего ProtectedProjectLayout
│       │       │                       #   server: fetch проекта по params.slug, проверка прав
│       │       │                       #   client shell: табы проекта, шапка с инфо
│       │       ├── page.tsx
│       │       ├── devlog/page.tsx
│       │       ├── team/page.tsx
│       │       ├── workflow/page.tsx
│       │       ├── documents/page.tsx
│       │       ├── vacancies/page.tsx
│       │       └── settings/[[...item]]/page.tsx
│       ├── events/
│       │   └── [eventId]/
│       │       ├── layout.tsx          # ← UI текущего ProtectedEventLayout
│       │       │                       #   server: fetch события по params.eventId
│       │       │                       #   client shell: табы события, шапка
│       │       ├── schedule/page.tsx
│       │       ├── members/page.tsx
│       │       ├── content/page.tsx
│       │       └── settings/[[...item]]/page.tsx
│       └── courses/                    # новый scaffold (Фаза 7)
│           └── [slug]/
│               ├── layout.tsx          # ← новый CourseShell (по аналогии с EventShell)
│               │                       #   server: fetch курса по params.slug + ownership
│               │                       #   client shell: табы курса
│               ├── page.tsx            # redirect → curriculum
│               ├── curriculum/page.tsx # заглушка
│               ├── cohorts/page.tsx    # заглушка
│               ├── students/page.tsx   # заглушка
│               ├── classroom/page.tsx  # заглушка
│               └── settings/page.tsx   # заглушка
│
└── (admin)/                            # AdminLayout + role-check в layout
    ├── layout.tsx                      # auth() → проверка role === "admin" → redirect
    └── admin/
        ├── audit-logs/page.tsx
        ├── posts/page.tsx
        ├── post/[id]/page.tsx
        ├── devlog-posts/page.tsx
        ├── workflows/page.tsx
        ├── workflow/[id]/page.tsx
        ├── project-workflow/[id]/page.tsx
        └── users/page.tsx
```

### Какие layouts с динамическим контекстом сохраняем

| Текущий компонент | Куда переезжает | Содержимое |
|---|---|---|
| `ProtectedProjectLayout` | `(user)/my/projects/[slug]/layout.tsx` | RSC: `prisma.project.findUnique({ slug })` + проверка ownership; client shell: табы/шапка проекта |
| `ProtectedEventLayout` | `(user)/my/events/[eventId]/layout.tsx` | RSC: `prisma.event.findUnique({ id })`; client shell: табы/шапка события |
| (создаётся в Фазе 7) | `(user)/my/courses/[slug]/layout.tsx` | RSC: `prisma.course.findUnique({ slug })` + ownership; client shell: табы курса (curriculum / cohorts / students / classroom / settings). Подстраницы — пустые заглушки, наполнение позже. |

### Hub-уровневые layouts — опционально

В исходном плане миграции были `(projects)`, `(events)`, `(courses)` под `hub/` — фактически их **не сделали**. Сейчас все `hub/*` страницы оборачиваются одним `ProtectedLayout`. После переезда они унаследуют общий `(protected)/hub/layout.tsx`.

Создавать отдельный `hub/events/layout.tsx`, `hub/courses/layout.tsx` имеет смысл **только если у этих веток есть отличающийся UI** (своя шапка списка курсов, фильтры по типам событий и т.п.). Если различий нет — общий hub layout достаточен. Это решение оставить на момент Фазы 3 (а не «по плану — обязательно делать»).

**Что меняется:**
- 51 страница перестаёт оборачивать себя в `<*Layout>`.
- `src/layouts/PublicLayout`, `ProtectedLayout`, `AdminLayout`, `EmptyLayout`, `LandingLayout` — удаляются, их роль перенимает `app/(*)/layout.tsx` + переиспользуемые UI-компоненты-шеллы.
- `src/layouts/ProtectedProjectLayout`, `ProtectedEventLayout` — **не удаляются**, разделяются на server-часть (входит в новый `layout.tsx`) и client-shell (используется тем же `layout.tsx` через пропсы).
- `proxy.ts` остаётся как сетевой gate (быстрее, чем server-side `auth()` в layout), но дополнительно `(protected)/layout.tsx` делает повторный `auth()` для server-side fetch'ей.

## Metadata API — план замены next-seo

### Текущий приём
```tsx
<PublicLayout
  title="Events"
  seo={{ openGraph: { type: "website", url: "/events" } }}
>
  ...
</PublicLayout>
```

### Целевой приём

Статичные страницы:
```tsx
// app/(public)/events/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "...",
  alternates: { canonical: "/events" },
  openGraph: { type: "website", url: "/events", title: "Events", description: "..." },
};

export default function EventsPage() { ... }
```

Динамические:
```tsx
// app/(public)/event/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  return {
    title: event.title,
    description: event.shortDescription,
    alternates: { canonical: `/event/${slug}` },
    openGraph: { type: "article", images: [event.coverImage] },
  };
}
```

Корневые дефолты выносятся в `app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: { default: "Gamelab", template: "%s · Gamelab" },
  description: "Game Developers Hub …",
  openGraph: { siteName: "Gamelab", locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
};
```

После этого `<NextSeo>`, `next-seo`, `config/seo.ts` — удалить, пакет `next-seo` — из `package.json`.

## Поэтапный план

### Фаза 0 — подготовка (без сноса)
**Цель:** иметь все необходимые "строительные блоки" до начала переноса страниц.

1. Завести `src/components/layouts/` — куда переедут UI-части старых `src/layouts/*` (шапка, сайдбар, footer) как чистые компоненты, без логики `"use client"` где это можно.
2. Написать `requireSession()` helper:
   ```tsx
   // src/helpers/require-session.ts
   import { redirect } from "next/navigation";
   import { auth } from "@/auth";
   export async function requireSession() {
     const session = await auth();
     if (!session) redirect("/signin");
     return session;
   }
   ```
   Использовать в `(protected)/layout.tsx`, `(user)/layout.tsx`, `(admin)/layout.tsx`.
3. Добавить корневые `metadata` defaults в `app/layout.tsx`.
4. Список «один Layout = один route group» зафиксирован в этом документе.

**Acceptance:** type-check 0 errors, dev-сервер работает, ничего не сломалось.

### Фаза 1 — `(public)` (16 страниц)
**Зачем первым:** проще всего, нет auth-логики, нет динамических `params` в layout.

1. Создать `src/app/(public)/layout.tsx` — серверный, импортирует UI-компоненты шапки/футера из Phase 0.
2. Переместить страницы: `app/blog/`, `app/events/`, `app/event/`, `app/jobs/`, `app/job/`, `app/projects/`, `app/project/`, `app/expert/`, `app/courses/[slug]`, `app/devlog/`, `app/verify/`, `app/legal-details/`, `app/privacy-policy/`, `app/cookie-policy/` → `app/(public)/*/`.
3. В каждой странице снять `<PublicLayout>` обёртку.
4. Добавить `export const metadata` (статические) или `generateMetadata` (динамические).
5. Удалить `src/layouts/PublicLayout/` после миграции последней страницы.

**Acceptance:** `/`, `/events`, `/blog`, `/blog/[slug]`, `/project/[slug]` рендерятся; `view-source:` показывает корректный `<title>` и `<meta>` теги; `<NextSeo>` из этих файлов исчез.

### Фаза 2 — `(auth)` (2 страницы)
1. `app/(auth)/layout.tsx` — минимальный, без обвязки.
2. `signin`, `registration` → `app/(auth)/`.
3. Удалить `src/layouts/EmptyLayout/` (компонент `CheckHealth` импортирует его — заменить inline-разметкой или оставить EmptyLayout только как простой div-wrapper в `components/`).

**Acceptance:** sign-in flow работает, регистрация работает.

### Фаза 3 — `(protected)` корневой (~12 страниц)
**Здесь начинаются server-side `auth()` и proxy.ts:**

1. `app/(protected)/layout.tsx` — server component:
   ```tsx
   import { requireSession } from "@/helpers/require-session";
   export default async function ProtectedLayout({ children }) {
     const session = await requireSession();
     return <ProtectedShell session={session}>{children}</ProtectedShell>;
   }
   ```
2. `proxy.ts` остаётся (быстрый сетевой gate), но `(protected)/layout.tsx` теперь — second line of defense + источник `session` для RSC-страниц.
3. Перенести: `hub/*`, `profile/page.tsx` (только просмотр профиля, **без** `settings`), `live/room/reports`.

> **`profile/settings/` НЕ переносится в `(protected)/profile/`** — оно переезжает в `(user)/my/settings/` в Фазе 4, потому что это управление личным аккаунтом, а не публичный профиль. Соответственно `app/profile/settings/[item]` нужно будет удалить (или редиректнуть на `/my/settings/[item]`) после Фазы 4.

**Acceptance:** защищённые роуты редиректят на /signin когда нет сессии (через proxy.ts) и через server-redirect в layout (когда middleware пропустил); `/profile` показывает просмотр профиля.

### Фаза 4 — `(user)/my/settings` (бывший profile/settings)
**Зачем отдельной фазой:** пилот для `(user)` группы, без `[slug]` и без fetch ресурса — самый простой запуск новой группы.

1. `app/(user)/layout.tsx` — server component:
   ```tsx
   import { requireSession } from "@/helpers/require-session";
   export default async function MyLayout({ children }) {
     await requireSession();
     // Заготовка для общей "My Workspace" обвязки (sidebar, etc.)
     return <>{children}</>;
   }
   ```
2. `app/(user)/my/settings/layout.tsx` — sider с пунктами настроек (persisted между навигациями!).
3. `app/(user)/my/settings/[item]/page.tsx` — содержимое каждой вкладки (general / specialities / mentorship / resources / connections / interests / danger).
4. Старый `app/profile/settings/[item]/page.tsx` удалить. Если есть линки/редиректы вида `/profile/settings/...` снаружи — добавить redirect rule (Next config `redirects()` или временный `app/profile/settings/redirect.tsx`).

**Acceptance:** `/my/settings/general` работает, sider не размонтируется при переходе general → specialities, старые `/profile/settings/...` редиректят на `/my/settings/...`.

### Фаза 5 — `(user)/my/projects/[slug]` (7 страниц)
**Самое сложное:** layout зависит от динамического сегмента.

Здесь используется UI текущего **`ProtectedProjectLayout`**, разделённый на:
- **server-часть** — нативный `layout.tsx`, делает fetch проекта по `params.slug` через `prisma`, проверяет ownership, при отсутствии — `notFound()`.
- **client shell** (`ProjectShell.tsx` в `components/layouts/`) — то, что было визуально в `ProtectedProjectLayout` (табы, шапка проекта, sider). Получает `project` пропсом из server layout.

1. Выделить из `src/layouts/ProtectedProjectLayout/index.tsx` UI-часть в `src/components/layouts/ProjectShell.tsx` (`"use client"`).
2. `app/(user)/my/projects/[slug]/layout.tsx`:
   ```tsx
   import { cache } from "react";
   import { notFound } from "next/navigation";
   import { prisma } from "@/services/prisma";
   import { ProjectShell } from "@/components/layouts/ProjectShell";

   const getProject = cache(async (slug: string) =>
     prisma.project.findUnique({ where: { slug } /* + relations */ }),
   );

   export default async function ProjectLayout({ children, params }) {
     const { slug } = await params;
     const project = await getProject(slug);
     if (!project) notFound();
     // ownership check тут или внутри ProjectShell
     return <ProjectShell project={project}>{children}</ProjectShell>;
   }

   export async function generateMetadata({ params }) {
     const { slug } = await params;
     const project = await getProject(slug); // тот же закэшированный fetch
     return { title: project?.name, /* og, canonical */ };
   }
   ```
3. `getProject` через `React.cache` означает: layout + generateMetadata + любая дочерняя page.tsx, использующая ту же функцию, получают **один** результат за render.
4. Перенести 7 страниц и снять `<ProtectedProjectLayout>` обёртку.
5. После миграции удалить `src/layouts/ProtectedProjectLayout/` (UI уже в `ProjectShell`).

**Acceptance:** все 7 страниц `/my/projects/[slug]/*` работают; `view-source:` показывает корректный `<title>` (название проекта); navigation между табами (`/my/projects/[slug]/team` → `/my/projects/[slug]/devlog`) **не размонтирует** шапку проекта.

### Фаза 6 — `(user)/my/events/[eventId]` (4 страницы)
Структурно аналогично фазе 5. Используется UI текущего **`ProtectedEventLayout`** — выделить в `EventShell.tsx`, server layout делает `prisma.event.findUnique({ id })`. Меньше страниц, паттерн уже отработан.

**Acceptance:** все 4 страницы `/my/events/[eventId]/*` работают; navigation между табами события не размонтирует шапку события.

### Фаза 7 — `(user)/my/courses/[slug]` (новый scaffold)

В коде сейчас нет `my/courses/[slug]/*`. Делаем по тому же паттерну, что в фазах 5 и 6, **сразу со страницами-заглушками**, чтобы зафиксировать структуру.

1. **Меню курса (client shell `CourseShell.tsx`):** табы
   - Curriculum (`/my/courses/[slug]/curriculum`)
   - Cohorts (`/my/courses/[slug]/cohorts`)
   - Students (`/my/courses/[slug]/students`)
   - Classroom (`/my/courses/[slug]/classroom`)
   - Settings (`/my/courses/[slug]/settings`)

2. **Server layout** `app/(user)/my/courses/[slug]/layout.tsx`:
   ```tsx
   import { cache } from "react";
   import { notFound } from "next/navigation";
   import { prisma } from "@/services/prisma";
   import { CourseShell } from "@/components/layouts/CourseShell";

   const getCourse = cache(async (slug: string) =>
     prisma.course.findUnique({ where: { slug } /* + relations нужные */ }),
   );

   export default async function CourseLayout({ children, params }) {
     const { slug } = await params;
     const course = await getCourse(slug);
     if (!course) notFound();
     // ownership check: текущий пользователь — автор/owner курса
     return <CourseShell course={course}>{children}</CourseShell>;
   }

   export async function generateMetadata({ params }) {
     const { slug } = await params;
     const course = await getCourse(slug);
     return { title: course?.title, alternates: { canonical: `/my/courses/${slug}` } };
   }
   ```

3. **Подстраницы-заглушки.** Каждая — простой client/server компонент с заголовком и плейсхолдером, который потом наполним:
   ```tsx
   // app/(user)/my/courses/[slug]/curriculum/page.tsx
   export default function CurriculumPage() {
     return (
       <Empty
         description="Curriculum builder coming soon"
         image={Empty.PRESENTED_IMAGE_SIMPLE}
       />
     );
   }
   ```
   То же — для `cohorts`, `students`, `classroom`, `settings`.

4. **Default редирект** на `curriculum`:
   ```tsx
   // app/(user)/my/courses/[slug]/page.tsx
   import { redirect } from "next/navigation";
   export default async function CourseIndexPage({ params }) {
     const { slug } = await params;
     redirect(`/my/courses/${slug}/curriculum`);
   }
   ```

5. **Доступ:** `/my/courses/[slug]/*` должен быть в матчере `proxy.ts` (`/my/:path*` — уже покрывает). Дополнительно — server-side ownership проверка в layout (только автор курса видит эти страницы).

6. **Что НЕ делаем сейчас:**
   - Не пишем CRUD для cohorts/students/classroom.
   - Не делаем формы.
   - Не добавляем кнопок «создать курс» где-то — это будет отдельная задача.

**Acceptance:** при ручном создании Course с известным `slug` в БД, переход на `/my/courses/<slug>/curriculum` показывает шапку курса (название из БД), табы переключаются без размонтирования шапки, остальные табы показывают пустые заглушки. Неавтор курса получает `notFound()`.

> Если в `prisma` схеме модели `Course` ещё нет (или у неё нет нужных полей вроде `ownerId`/`authorId`) — это блокер для Фазы 7. Прежде чем начать фазу, проверить схему в `gdhub-prisma` репо.

### Фаза 8 — `(admin)` (8 страниц)
1. `app/(admin)/layout.tsx` — server component с проверкой роли:
   ```tsx
   const session = await auth();
   if (!session?.user.roles?.includes("Admin")) notFound();
   ```
2. Перенести 8 страниц.
3. Удалить `src/layouts/AdminLayout/`.

**Acceptance:** не-админ получает 404 на `/admin/*` (вместо текущей логики).

### Фаза 9 — `LandingLayout` (1 потребитель — `HomeClient`)
Решить отдельно: либо превратить `app/page.tsx` в файл, использующий собственный layout (если landing-шапка отличается от `(public)`), либо положить лендинг под `(public)/layout.tsx` и удалить `LandingLayout`. Если landing-страница уже сейчас тащит `LandingLayout` через `dynamic(... { ssr: false })`, это анти-паттерн в App Router — убрать `ssr: false` и сделать обычным импортом.

### Фаза 10 — финальная уборка
1. Удалить из `src/layouts/`: `PublicLayout`, `ProtectedLayout`, `AdminLayout`, `EmptyLayout`, `LandingLayout`.
   `ProtectedProjectLayout` и `ProtectedEventLayout` — их UI к этому моменту уже в `components/layouts/ProjectShell.tsx` и `EventShell.tsx`, исходные папки тоже удаляются.
2. Удалить пакет `next-seo` из `package.json`.
3. Удалить `src/config/seo.ts` (если он только под next-seo).
4. Обновить `docs/migration-completion-summary.md`: «next-seo retirement» из open items — done.
5. Прогнать `npm run type-check`, `npm run lint`, `npm run build` — все 0 errors.
6. Smoke-test основных user flow: главная → signin → hub → проект → события → admin.

## Риски и mitigations

| Риск | Митигация |
|---|---|
| Динамическая загрузка данных в layout дублирует запрос внутри page | Использовать `React.cache(getProject)` или `unstable_cache` — оба слоя получат тот же закэшированный promise |
| `"use client"` шапка нужна для AntD `useBreakpoint`, dropdown'ов и т.д. | Layout остаётся серверным; UI-shell — отдельный client component, в layout пробрасываются propsами |
| Текущий `proxy.ts` и server-side `auth()` в layout продублируют логику | Оставить `proxy.ts` как fast gate, layout — как fallback и источник данных |
| Метаданные в Russian не подхватываются | `metadataBase` обязателен, иначе `alternates.canonical` относительные не работают |
| `<NextSeo>` где-то задаёт image, который не повторён в Metadata | На каждой фазе grep'ом найти все openGraph.image / twitter.image и перенести |
| `generateMetadata` блокирует рендер при медленном fetch | Использовать `React.cache` чтобы layout + metadata + page делили один promise |
| `ssr: false` динамические импорты сломаются | App Router больше не поддерживает `ssr: false` в server components; делать просто `dynamic(...)` без флага, либо вынести в client component |

## Метрика «готово»

- 0 файлов в `src/layouts/` (или папка удалена).
- 0 импортов `next-seo` в коде.
- `(public)`, `(auth)`, `(protected)`, `(user)`, `(admin)` — все группы созданы.
- `npm run type-check` + `npm run lint` + `npm run build` → green.
- next-seo и связанные подзависимости вычищены из `package.json`.

## Оценка трудозатрат

| Фаза | Сложность | Файлов | Ориентировочно |
|---|---|---|---|
| 0. Подготовка + `requireSession()` helper | низкая | 3-5 | 1-2 часа |
| 1. (public) | низкая | 16 | 3-4 часа |
| 2. (auth) | низкая | 2 | 30 минут |
| 3. (protected) корень (hub, profile, live) | средняя | 12 | 4-5 часов |
| 4. (user)/my/settings (бывший /profile/settings) | средняя | layout + [item] | 2-3 часа |
| 5. (user)/my/projects/[slug] | высокая | 7 + layout | 4-5 часов |
| 6. (user)/my/events/[eventId] | средняя | 4 + layout | 2-3 часа |
| 7. (user)/my/courses/[slug] (новый scaffold) | средняя | layout + 5 заглушек | 2-3 часа |
| 8. (admin) | низкая | 8 | 2 часа |
| 9. LandingLayout | низкая | 1 | 30 минут |
| 10. Уборка | низкая | — | 1 час |
| **ИТОГО** | | ~50 миграция + 6 новых | **~23-29 часов** |

Делать фазами с отдельными коммитами/PR'ами; после каждой фазы — type-check + lint + smoke-test на затронутых роутах.
