# Этап 2 — Сводка: App Router скелет + Turbopack + Auth.js v5

## Что сделано

### Auth.js v5 миграция
- **[src/auth.ts](src/auth.ts)** — фабрика Auth.js v5: `NextAuth(authConfig)` → `{ handlers, auth, signIn, signOut }`. Перенесён весь конфиг провайдеров (Google OAuth, Email через Brevo), Prisma adapter (теперь `@auth/prisma-adapter`), JWT-callback с Matrix user provisioning, session-callback с refresh-token rotation для Google.
- **[src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts)** — App Router route handler, re-export `GET/POST` из `handlers`.
- **Удалён** `src/pages/api/auth/[...nextauth].ts`.
- **[src/middleware.ts](src/middleware.ts)** — переписан с `withAuth` (v4) на `auth((req) => ...)` wrapper (v5). Логика редиректов (onboarding, live/room/reports roles guard, profile/settings) сохранена.
- **[src/lib/api-middlewares.ts](src/lib/api-middlewares.ts)** + **[src/lib/api-project-guard.ts](src/lib/api-project-guard.ts)** — `getServerSession(req, res, authOptions)` → `auth(req, res)` (Pages Router overload Auth.js v5).
- **15 файлов** с прямым `getServerSession`/`getSession` → `auth(req, res)`:
  - API: `file/delete`, `devlog/[id]/applause`, `user/privacy`, `user/project/lifecycle`, `project/[projectId]/applause`, `notion/page`
  - Pages: `signin`, `registration`, `hub/docs/[[...slug]]`, `hub/members`, `expert/[specialityId]`, `project/[projectSlug]`, `devlog/[projectReportId]`, `job/[vacancyId]`
- В типах `NextApiRequest` vs `IncomingMessage` несовместимы в `getServerSideProps`-контексте — временный каст `context.req as any, context.res as any` в 7 страницах. Будет очищено в Этапе 3 при миграции страниц на App Router (там `auth()` без аргументов).

### App Router скелет
- **[src/app/layout.tsx](src/app/layout.tsx)** — root layout с `<html><body><Providers>` и `metadata`.
- **[src/app/providers/index.tsx](src/app/providers/index.tsx)** — composition: `SessionProvider` (Auth.js v5) → `QueryProvider` (react-query) → `AntdRegistry` (cssinjs SSR).
- AntD SSR — официальный пакет `@ant-design/nextjs-registry` ([гайд](https://ant.design/docs/react/use-with-next)). `AntdRegistry` оборачивает дерево в `app/providers/index.tsx` — он сам делает `StyleProvider` + `useServerInsertedHTML` под капотом.
- **[src/app/providers/QueryProvider.tsx](src/app/providers/QueryProvider.tsx)** — `QueryClient` + Devtools.
- **[src/app/not-found.tsx](src/app/not-found.tsx)** — 404 в App Router.
- **[src/app/error.tsx](src/app/error.tsx)** — error boundary App Router.

> Tolgee provider пока **не** вынесен в `app/layout.tsx` — он остаётся в `pages/_app.tsx` и обслуживает Pages-страницы. При миграции в Этапе 3 (первая страница, использующая Tolgee из App Router) добавим в Providers.

### Turbopack + конфиг
- **[next.config.js](next.config.js)**:
  - Удалён блок `i18n` (не поддерживается App Router, у нас всё равно один локаль `en`).
  - Добавлен `turbopack.rules` для SVG → `@svgr/webpack`.
  - Webpack-блок оставлен как fallback (`yarn dev:webpack`, `yarn build:webpack`).
- **[package.json](package.json)** scripts:
  - `dev` → `next dev --turbopack`
  - `build` → `next build --turbopack`
  - Альтернативы `dev:webpack`, `build:webpack` остаются.

### Транзитивные deps возвращены
- `next-seo@^6.5` — нужен Pages-страницам до миграции в Этап 3 (8 файлов).
- `next-csrf` — нужен `helpers/csrf.ts` до замены на `@edge-csrf/nextjs` в Этапе 5.
- `nextjs-progressbar` — нужен `pages/_app.tsx` до миграции в Этап 3.

### Точечные React 19 фиксы
- 5 мест с `useRef<T>()` → `useRef<T>(null)` (React 19 требует initial value):
  - `DevLogWall/PostForm`, `LandingWhoWeAreSection`, `EditPostModal`, `ProjectReportModal`, `GeneralProjectForm`.

### AntD 6 mini-фикс
- `theme.ts`: `cssVar: true` → `cssVar: {}` (AntD 6 убрал boolean-вариант, осталась только object-форма).

## Текущее состояние

| Метрика | Этап 1 → Этап 2 |
|---|---|
| `npm run type-check` | 59 → **13 ошибок** |
| `npm run lint` | ✅ → ✅ |
| `package.json` deps | переключены на Auth.js v5 |

### Остаток type-check (13 шт., все из плана §4 Этап 3)

| Файл | Категория | Будет починено в |
|---|---|---|
| `components/Chat/ChatMessages.tsx` (4) | AntD 6 `@ant-design/x` API change (BubbleDataType, messageRender, scrollTo offset, BubbleListProps) | Этап 3 (Chat миграция) |
| `components/Chat/ChatRooms.tsx` | AntD 6 `Conversation` → `Conversations` | Этап 3 |
| `components/MyTeam/index.tsx` | AntD 6 `Modal.confirm.destroyOnClose` → `destroyOnHidden` | Этап 3 |
| `components/TeamMemberCard/index.tsx` | AntD 6 `Modal.confirm.content` API | Этап 3 |
| `components/RoadmapChart/index.tsx` | `Dayjs | null` narrowing | Этап 3 |
| `pages/devlog/.../index.tsx` (2) | EditorJS Blob, `Orientation` type | Этап 3 (devlog) |
| `pages/live/room/reports/index.tsx` | Prop type drift | Этап 3 (live) |
| `tests/vacancy.test.ts` | `next-auth/next` → переписать тест | Этап 6 |

## Что **не** делалось в этом этапе

- Tolgee SSR в `app/layout.tsx` (отложено — пока Pages-страницы доминируют).
- Перенос `globals.scss` в `app/` (оставлен в `styles/`, `app/layout.tsx` его уже импортирует).
- Перенос `sitemap.xml.ts` в `app/sitemap.ts` (отложено в Этап 3, Pages-версия пока работает).
- AntD 6 API-fixes для chat/modal (отложено в Этап 3 при миграции страниц).
- Замена `next-csrf` (Этап 5).

## Следующий шаг

Этап 3: миграция страниц на App Router посегментно. Первая итерация — статика без auth (`/`, `cookie-policy`, `privacy-policy`, `legal-details`, `events`, `test-seo`, `ui-test`, `404`).
