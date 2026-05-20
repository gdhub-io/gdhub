# Этап 0 — Аудит и baseline

> Сгенерировано автоматически в начале миграции. Обновляется по мере прохождения этапа.

## Baseline (Next.js 14.2.33)

| Команда | Статус |
|---|---|
| `npm run type-check` | ✅ зелёный (tsc --noEmit, без ошибок) |
| `npm run lint` | ✅ зелёный (biome — 471 файлов, 0 ошибок) |
| `npm test -- --run` | ❌ 7 fail / 6 pass / 4 skip — **пре-существующая поломка** |
| `npm run build` | ✅ зелёный (сборка успешна) |

### Vitest baseline — пре-существующие поломки
3 тест-файла падают на текущем `14.2.33`:
- `tests/devlog.test.ts` — частично.
- `tests/project.test.ts` — частично.
- `tests/vacancy.test.ts` — почти все ассерты (`401`, `404` вместо `200`).

Причины (по выводу):
- Моки `next-auth` `getServerSession` возвращают сессию, но `query` в `createMocks` не совпадает с тем, что handler парсит → handler возвращает 404.
- Auth-проверки в handler'ах не пробрасывают user-id, который ждут моки → 401.

Это **не блокер для миграции**: после переезда на Route Handlers все эти тесты переписываются.

**Действие после миграции**: переписать unit-тесты на новые Route Handlers либо заменить их Playwright e2e + API contract тестами. Существующие сломанные тесты пока не правим — их базовая структура устареет.

### Скрипт `npm test`
В [package.json](package.json) `"test": "dotenv vitest"` — флаг `--run` корректно докидывается через `--`, но `dotenv-cli` ест `--`, и vitest по умолчанию входит в watch-mode. На миграции стоит переписать скрипт на `"test": "dotenv -- vitest"` или `"test": "dotenv -- vitest run"`.

## Deprecated Next.js API в коде

### `router.events` (Pages-only) — 2 файла
- [src/pages/_app.tsx:122-129](src/pages/_app.tsx#L122) — логирование route changes для dev (можно полностью удалить, не критично).
- [src/components/admin/BlogPostEditor/index.tsx:144-166](src/components/admin/BlogPostEditor/index.tsx#L144) — confirm-on-leave при unsaved changes. **Требует замены** на:
  - `beforeunload` для hard nav,
  - `onClick`-перехват `<Link>` или next-router `router.push` для soft nav (в App Router нет прямого аналога `routeChangeStart`).

### `router.isReady` — 1 файл
- [src/components/PageViews/index.tsx:34](src/components/PageViews/index.tsx#L34) — `enabled: router.isReady`. В App Router `useSearchParams()` всегда возвращает значение → проверка не нужна.

### `router.locale` — 1 файл
- [src/pages/_app.tsx:63](src/pages/_app.tsx#L63) — `useTolgeeSSR(tolgeeService, router.locale)`. У нас один локаль `en`, при удалении `i18n` из next.config можно захардкодить или брать из `headers()`.

### `router.asPath` — ~20 файлов
- В большинстве — для SEO `canonical` URL и `openGraph.url`. В App Router → `usePathname()` + `useSearchParams()` или, для серверной части, `headers().get('x-pathname')` через middleware-инжект.
- Для callbacks (`/signin?callbackUrl=...`) → `usePathname()` + `useSearchParams()`.

### `next/head` — 3 файла
- [src/pages/registration/index.tsx](src/pages/registration/index.tsx)
- [src/pages/invite/[token].tsx](src/pages/invite/[token].tsx)
- [src/pages/signin/index.tsx](src/pages/signin/index.tsx)

Заменить на `export const metadata` или `generateMetadata` при миграции страницы.

## Recoil — НЕ ИСПОЛЬЗУЕТСЯ

`recoil@0.7.7` присутствует в `dependencies`, но в коде (`src/`, `tests/`) **нет ни одного импорта или использования**.

→ **Этап 1.5 упрощается**: ничего мигрировать не нужно, только `npm uninstall recoil` (выполнится в Этапе 1).

## Совместимость зависимостей с React 19

Проверены peer-dependencies всех основных React-пакетов через `npm view`. Резюме:

### ✅ Поддерживают React 19 (peer-range `^18 || ^19` или `>= 18`)
- `antd`, `@ant-design/cssinjs`, `@ant-design/icons`, `@ant-design/x`
- `@hello-pangea/dnd@18.0.1` (`^18.0.0 || ^19.0.0`)
- `@dnd-kit/*`, `@tabler/icons-react`
- `@mdxeditor/editor`, `@svar-ui/react-gantt`
- `@react-email/components` (`^18.0 || ^19.0`)
- `@ably/chat-react-ui-components` (`^18.0.0 || ^19.0.0`)
- `react-instantsearch` (`>= 16.8.0 < 20`)
- `next-seo`, `nextjs-progressbar` (но они **удаляются** при миграции)
- `react-markdown`, `react-player`, `react-youtube`, `react-country-flag`, `react-nice-avatar`, `react-linkify-it`, `antd-img-crop`, `react-responsive-masonry`, `react-select-country-list`, `telegram-react-auth-button`, `@daily-co/daily-react`, `react-redux` (через `@hello-pangea/dnd`).

### ⚠️ Strict React 18 only
- **`@9gustin/react-notion-render@3.11.4`** — `peerDependencies: { react: "^18.2.0" }`. Последняя опубликованная версия (npm view) тоже только React 18. Используется в:
  - [src/pages/cookie-policy.tsx](src/pages/cookie-policy.tsx)
  - [src/pages/privacy-policy.tsx](src/pages/privacy-policy.tsx)
  - [src/pages/hub/docs/[[...slug]].tsx](src/pages/hub/docs/[[...slug]].tsx)
  - [src/components/WorkflowContent/WorkflowStepContent/index.tsx](src/components/WorkflowContent/WorkflowStepContent/index.tsx)

  **Опции** (решим в Этапе 1):
  1. Установить с `--legacy-peer-deps` или `overrides` в package.json — в API используется только `<Render blocks={...} />`, скорее всего работает на React 19.
  2. Заменить на `react-notion` или собственный мини-рендерер (4 точки использования, нагрузка не большая).
  3. Форкнуть и обновить peer-deps.

  **Рекомендация**: вариант 1 на первой итерации; если падает в рантайме — вариант 2.

### Прочие package-уровневые риски
- `formidable@^2`, `multer@^1.4.5-lts` — не React-зависимости, но в App Router их usage уходит в `request.formData()` (см. Этап 4).
- `next-auth@^4.24.8` → `next-auth@^5` (Auth.js v5). 16 файлов с `getServerSession`/`getSession` потребуют правки в Этапе 2.

## next-api-decorators — стратегия полной замены

Используется в **130+ API файлах** в `src/pages/api/`. Реальный декоратор-инвентарь по аудиту:

| Декоратор | Использований | Замена в App Router |
|---|---|---|
| `@Get` | 116 | export `GET` из route.ts |
| `@Post` | 43 | export `POST` |
| `@Put` | 45 | export `PUT` |
| `@Delete` | 21 | export `DELETE` |
| `@Patch` | редко | export `PATCH` |
| `@Req()` | 122 | `(req, ctx, locals) => locals.user` |
| `@Query` | 82 | `req.nextUrl.searchParams` + `withValidation` |
| `@Param` | 73 | `ctx.params` (нативные сегменты файловой системы) |
| `@Body` | 70 | `await req.json()` + `withValidation(zodSchema)` |
| `@Res` | 6 | `NextResponse.json(...)` |
| `@UseMiddleware` | 1 | HOF-композиция |
| `@NextAuthGuard(mode, roles?)` | 94 | `withAuth({ mode, roles })` HOF |
| `@ApiProjectTeamGuard()` | ~10 | `withTeamGuard()` HOF |
| `@Body(ValidationPipe) Dto` | 70 | `withValidation(ZodSchema)` |

**22 catch-all файлов `[[...params]].ts`** с внутренним суброутингом (`@Put("/:id/publish")` и т.д.) — каждый режется на отдельные `app/api/.../route.ts` под нативные сегменты файловой системы.

Адаптер `src/lib/route-handler-adapter.ts` — utility для нестандартных случаев. По умолчанию каждый handler **переписывается** на чистый App Router.

Подробности в [docs/migration-nextjs-16-app-router.md](docs/migration-nextjs-16-app-router.md) §4 Этап 4.

## Структура src/pages для будущей миграции

Группы для будущих `(group)/layout.tsx` в App Router:

| Текущая папка | Целевая группа App Router | Layout |
|---|---|---|
| `pages/blog/*`, `pages/events.tsx`, `pages/event/[slug]`, `pages/expert/*`, `pages/project/*`, `pages/projects/*`, `pages/jobs/*`, `pages/job/*`, `pages/courses/*`, `pages/devlog/*`, `pages/verify/*`, `pages/cookie-policy`, `pages/privacy-policy`, `pages/legal-details`, `pages/index.tsx` | `app/(public)/...` | `PublicLayout`, `LandingLayout` |
| `pages/signin/*`, `pages/registration/*`, `pages/invite/*` | `app/(auth)/...` | `EmptyLayout` или специальный |
| `pages/hub/*` (root + members + docs) | `app/(protected)/hub/...` | `ProtectedLayout` + `HubLayout` |
| `pages/hub/projects/*`, `pages/hub/project/*` | `app/(protected)/hub/(projects)/...` | + `HubProjectsLayout` |
| `pages/hub/events/*`, `pages/hub/event/*` | `app/(protected)/hub/(events)/...` | + `HubEventsLayout` |
| `pages/hub/courses/*` | `app/(protected)/hub/(courses)/...` | + `HubCoursesLayout` |
| `pages/my/*` | `app/(protected)/my/...` | `ProtectedLayout` |
| `pages/profile/*` | `app/(protected)/profile/...` | `ProtectedLayout` |
| `pages/live/*` | `app/(protected)/live/...` | `DemoDayLayout`/`ProtectedEventLayout` |
| `pages/admin/*`, `pages/_dev/*` | `app/(admin)/...` | `AdminLayout` |

## Файлы со специальной конфигурацией API

- [src/pages/api/file.ts](src/pages/api/file.ts) — `bodyParser: false` + `formidable`. В Route Handler: `request.formData()`.
- [src/pages/api/user/parse/cv.ts](src/pages/api/user/parse/cv.ts) — `bodyParser: false` + `maxDuration: 300`. В Route Handler: `request.formData()` + `export const maxDuration = 300`.

## Vercel cron (без изменений)

Из [vercel.json](vercel.json):
- `/api/cron/devlog-reminder` — daily 10:00
- `/api/cron/advice-request-reminder` — daily 11:00
- `/api/cron/event-reminder` — daily 03:00
- `/api/cron/project-status-maintenance` — daily 04:00

URL остаются те же → в `vercel.json` нужно только обновить glob `functions`.

---

**Готовность к Этапу 1**: ✅ после завершения baseline build и baseline ручной чек-листа.
