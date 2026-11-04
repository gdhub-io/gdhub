# План миграции: Next.js 14.2.33 (Pages Router) → Next.js 16.2.6 (App Router)

> Согласовано. Работа идёт в текущей ветке `upgrade-to-16`, поэтапными коммитами.

## Находки Этапа 0 (фактические)

Подробный аудит — [docs/migration-audit.md](docs/migration-audit.md). Baseline-чеклист — [docs/migration-baseline-checklist.md](docs/migration-baseline-checklist.md). Кратко:

- ✅ `type-check`, `lint`, `build` на baseline 14.2.33 — зелёные.
- ❌ `vitest` — 7 тестов падают (пре-существующая поломка моков, не блокер).
- ✅ Playwright установлен (`@playwright/test@1.60.0`), Chromium скачан, конфиг [playwright.config.ts](playwright.config.ts), первый smoke [tests/e2e/home.spec.ts](tests/e2e/home.spec.ts) — обнаруживается `playwright test --list`.
- ✅ Скелет адаптера: [src/lib/route-handler-adapter.ts](src/lib/route-handler-adapter.ts).
- **`recoil` НЕ ИСПОЛЬЗУЕТСЯ** в коде — Этап 1.5 сводится к `yarn remove recoil`.
- **`@9gustin/react-notion-render@3.11.4`** — единственный пакет с жёстким peer `react: ^18.2.0`. Используется в 4 файлах ([cookie-policy.tsx](src/pages/cookie-policy.tsx), [privacy-policy.tsx](src/pages/privacy-policy.tsx), [hub/docs/[[...slug]].tsx](src/pages/hub/docs/[[...slug]].tsx), [WorkflowContent/WorkflowStepContent](src/components/WorkflowContent/WorkflowStepContent/index.tsx)). Решение по нему — в Этапе 1 (`--legacy-peer-deps` / `overrides` / замена).
- **`next-api-decorators` уходит полностью.** Все API мигрируют на нативные Route Handlers в `src/app/api/**`. Декоратор-стиль middleware заменяется на higher-order functions (HOF). Скелет адаптера в [src/lib/route-handler-adapter.ts](src/lib/route-handler-adapter.ts) — это утилита на случай, если для конкретной сложной route понадобится временный «совместимый» wrapper, но дефолтная стратегия — переписывать на чистый App Router.
- `router.events` использует только [_app.tsx](src/pages/_app.tsx) (dev-only логи, можно удалить) и [BlogPostEditor](src/components/admin/BlogPostEditor/index.tsx) (confirm-on-leave — нужна замена на `beforeunload` + link-interceptor).
- **AntD subcomponent dot-notation в Server Components**: `<Typography.Text>`, `<Form.Item>`, `<List.Item>` и т.п. — по [официальной доке AntD](https://ant.design/docs/react/use-with-next), это **не работает в Server Components**, нужно `import { Item } from "antd/es/list"` через полные пути. Аудит показал 87 файлов с dot-notation, доминирует `Form.Item` (408 использований). У нас почти все страницы интерактивные → будут `"use client"` (где dot-notation работает). При миграции серверных страниц (статика типа cookie-policy/privacy-policy) — переписываем на полные пути.
- `next/head` — 3 файла, все в auth-flow страницах (`registration`, `invite`, `signin`).

---

## Принятые решения (см. §5)

- `next-api-decorators` → **адаптер** в Route Handlers, переписывание — отдельной задачей.
- `next-auth@4` → **Auth.js v5** сразу в рамках миграции.
- **Turbopack** включаем сразу для `dev` и `build`; webpack-конфиг сохраняем как fallback.
- `recoil` → **`zustand`** (уже частично используется).
- **CSRF**: `@edge-csrf/nextjs`.
- **Стратегия PR**: поэтапные коммиты в текущей ветке `upgrade-to-16`.
- **Тестовое окружение**: staging есть, прокатываем перед прод-выкаткой.
- **E2E**: Playwright в проекте **ещё не настроен**, толковых тестов нет. Поднимаем с нуля в Этапе 0 и пишем по ходу миграции (см. §4). Baseline-набора нет → за «эталон поведения» берём ручную проверку + скриншоты на текущем `14.2.33`, а Playwright-покрытие наращиваем уже на новой архитектуре.
- **Зависимости**: при апгрейде обновляем `antd` и остальные пакеты до последних совместимых с Next 16 / React 19 версий.

---

## 1. Текущее состояние (аудит)

| Категория | Значение |
|---|---|
| Текущий Next.js | `14.2.33` |
| Целевой Next.js | `16.2.6` |
| React | `18.3.1` → требуется `19.x` |
| Node (engines не задан, локально v24) | требуется `>= 20.9` |
| Структура | `src/pages/` (Pages Router), `app/` отсутствует |
| Pages (`.tsx` в `src/pages/`, без `api/`) | ~67 файлов |
| API routes в `src/pages/api/` | ~130 файлов |
| Файлов с `getServerSideProps` / `getStaticProps` / `getInitialProps` | 20 |
| Файлов с `getLayout`-паттерном | 9 |
| Layouts в [src/layouts/](src/layouts/) | 9 директорий |
| Файлов с `useRouter` / `next/router` | ~62 |
| `router.events` (subscribe) | 2 файла ([_app.tsx](src/pages/_app.tsx), `BlogPostEditor`) |
| `next/image` / `next/link` / `next/head` | ~82 файла |
| API c `NextApiRequest/Response` или `next-api-decorators` | ~124 файла |
| Динамические/catch-all API | 28 / 22 |
| API с `export const config = { api: { bodyParser: false } }` | [api/file.ts](src/pages/api/file.ts), [api/user/parse/cv.ts](src/pages/api/user/parse/cv.ts) |
| Middleware | [src/middleware.ts](src/middleware.ts) (next-auth `withAuth`) |
| Custom Document/App | [_document.tsx](src/pages/_document.tsx) (AntD cssinjs SSR), [_app.tsx](src/pages/_app.tsx) |

### Внешние зависимости, завязанные на Pages Router
- `next-api-decorators` — классовые контроллеры на `experimentalDecorators` (130+ файлов). **Официально только для Pages Router**, в App Router как Route Handlers не работает напрямую — нужен адаптер или переписывание.
- `next-csrf` — CSRF-helper на старом API, используется в [helpers/csrf.ts](src/helpers/csrf.ts).
- `next-seo` (`DefaultSeo`, `NextSeo`) — 9 файлов, основан на `next/head`. В App Router замещается Metadata API.
- `nextjs-progressbar` — слушает `router.events` Pages Router; в App Router события другие, потребует замены (`@bprogress/next` или собственное решение через `usePathname`).
- `next-auth@4` — рабочая версия для App Router (есть `getServerSession` + `headers()` адаптация). Можно остаться на v4, либо мигрировать на Auth.js v5 (отдельным шагом).
- `formidable` / `multer` + `bodyParser: false` — в Route Handlers нет `api.bodyParser`; нужно перейти на `request.formData()` / стримы.
- `@ant-design/cssinjs` SSR-cache в `_document.tsx` — нужен новый паттерн для App Router (root-layout `StyleProvider` + `useServerInsertedHTML`).
- `i18n` в [next.config.js](next.config.js) — встроенный i18n из Pages Router **не поддерживается App Router**, локали будут жить через сегмент `[locale]` или через middleware. Сейчас активен только `en`, миграция упрощается.

### Прочее
- `webpack` в [next.config.js](next.config.js): `@svgr/webpack`, `topLevelAwait`, кастомный `cache`. Целимся на **Turbopack** как default:
  - SVG → `turbopack.rules`:
    ```js
    turbopack: {
      rules: {
        '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
      },
    }
    ```
    (`@svgr/webpack` совместим с loader-API Turbopack.)
  - `topLevelAwait` — Turbopack поддерживает из коробки.
  - Кастомный `cache: { type: 'memory' }` — Turbopack игнорирует webpack-cache, заменяется встроенным persistent-кешем.
  - `ignoreWarnings` (для `@svar-ui/react-gantt`) — в Turbopack эквивалент не нужен (другая система warning'ов); проверим, что warning не блокирующий.
  - Webpack-блок оставляем как fallback (Next 16 позволяет иметь оба — webpack срабатывает, если запустить с `next dev` без `--turbo` или явно переключить).
- `output: "standalone"` — поддерживается.
- `experimental.serverComponentsExternalPackages` — переехало в `serverExternalPackages` (стабилизировано).
- [vercel.json](vercel.json) `functions` glob завязан на `src/pages/api/**/*.ts` — после миграции маршруты будут в `src/app/.../route.ts`, glob нужно обновить.
- **Апгрейд зависимостей**: при миграции поднимаем до последних совместимых с Next 16 / React 19 версий:
  - `antd@^5.latest`, `@ant-design/*` (включая `cssinjs`, `icons`, `x`),
  - `@tanstack/react-query@^5.latest`,
  - `next-seo` → удаляется (Metadata API),
  - `next-auth@^4` → `next-auth@^5` (Auth.js v5),
  - `recoil` → удаляется (миграция на `zustand`),
  - `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`,
  - `eslint-config-next@^16`, `typescript` — оставляем 5.8+,
  - `@dnd-kit/*`, `@tabler/icons-react`, `dayjs` и пр. — апгрейд major-версий по факту необходимости (если ломаются типы / API).
  - Проверка через `npm ls react` после bump'а: все React-зависимости должны поддерживать React 19.

---

## 2. Целевая архитектура

```
src/
  app/
    layout.tsx                       # root layout: providers, fonts, AntD SSR, SessionProvider, Tolgee, QueryClient
    globals.scss
    not-found.tsx                    # бывший 404.tsx
    error.tsx                        # error boundary
    sitemap.ts                       # бывший sitemap.xml.ts
    robots.ts                        # (если нужен)

    (public)/                        # group: PublicLayout
      page.tsx                       # бывший index.tsx
      events/page.tsx
      blog/
        page.tsx
        [slug]/page.tsx
      ...

    (protected)/                     # group: ProtectedLayout + middleware-гейт
      hub/
        layout.tsx                   # HubLayout (общий каркас hub)
        page.tsx
        docs/[[...slug]]/page.tsx
        members/page.tsx

        (projects)/                  # вложенная группа: свой layout для проектов
          layout.tsx                 # HubProjectsLayout
          projects/page.tsx
          project/[projectSlug]/page.tsx

        (events)/                    # вложенная группа: свой layout для событий
          layout.tsx                 # HubEventsLayout
          events/page.tsx
          event/[slug]/page.tsx

        (courses)/                   # вложенная группа: свой layout для курсов
          layout.tsx                 # HubCoursesLayout
          courses/page.tsx
          courses/[slug]/page.tsx

      my/...                         # MyLayout (личный кабинет)
      profile/...                    # ProfileLayout
      live/...                       # LiveLayout (DemoDayLayout/ProtectedEventLayout)

    (admin)/
      admin/...                      # AdminLayout

    api/
      auth/[...nextauth]/route.ts    # Auth.js v5
      courses/route.ts
      courses/[slug]/route.ts
      file/route.ts                  # multipart через request.formData()
      ...

  middleware.ts                      # остаётся; интегрируется с auth() из Auth.js v5
  components/                        # client/server-component разделение
  layouts/                           # переезжают в app/.../layout.tsx, директория удаляется
  ...
```

> **Группы `(projects)` / `(events)` / `(courses)` внутри `hub/`** — group routes (со скобками), не влияют на URL. Они нужны, чтобы каждый раздел получил свой `layout.tsx` поверх общего `hub/layout.tsx`. Итоговые URL: `/hub/projects`, `/hub/events`, `/hub/courses` — без изменений.

Принципы:
- **Все интерактивные компоненты с хуками/контекстом** (`useRouter`, `useState`, AntD, recoil, zustand, react-query consumers) помечаются `"use client"`.
- **Серверные данные** (Prisma, `getServerSession`, секреты) — Server Components / Route Handlers.
- Текущий `getServerSideProps` → серверный компонент `page.tsx` с прямым вызовом БД, либо `fetch(..., { cache: 'no-store' })`.
- Текущий `getStaticProps` → Server Component с `fetch(..., { next: { revalidate } })`, либо `generateStaticParams`.
- Все `getLayout` → вложенные `layout.tsx` в группах маршрутов.

---

## 3. Ключевые риски и их митигация

| Риск | Митигация |
|---|---|
| **`next-api-decorators` не работает в App Router** | Полная замена: HOF-middleware (`withAuth`, `withTeamGuard`, `withValidation`) + native Route Handlers + Zod вместо class-validator. Catch-all routes (`[[...params]]`) с внутренним суброутингом режутся на отдельные сегменты файловой системы App Router. См. подробно §4 Этап 4. Адаптер `toRouteHandler` остаётся как fallback для нестандартных случаев. |
| **AntD SSR cache** | Использовать `useServerInsertedHTML` из `next/navigation` в client-провайдере, обёрнутом в `app/layout.tsx`. |
| **AntD v5 совместимость с React 19** | `antd` поднимаем до последней `^5.x`, проверяем `@ant-design/cssinjs`, `rc-*`, `@ant-design/x`. При несовместимости — обновляем поштучно. |
| **React 18 → React 19** | `recoil` **удаляется** — все store-кейсы переезжают на `zustand` (см. отдельную задачу в §4 Этап 1.5). Остальной list-check внешних React-зависимостей через `npm ls react`. |
| **NextAuth v4 → Auth.js v5** | Меняется shape конфига (`auth.ts` с фабрикой), helpers (`auth()` вместо `getServerSession`), интеграция middleware (`auth` wrapper вместо `withAuth`). 16 файлов с `getSession`/`getServerSession` обновляются. Провайдеры (Google, Email) и `PrismaAdapter` совместимы. |
| **`next/router` → `next/navigation`** | API отличается: `useRouter()` нет `.query`, `.events`, `.isReady`, `.asPath`, `.locale`. `.query` → `useSearchParams()` + `useParams()`. Замена `router.events` в [_app.tsx:122](src/pages/_app.tsx#L122) на коллбеки через `usePathname` + side-effect. |
| **i18n config удалён в App Router** | У нас один `en`-локаль, можно полностью убрать `i18n` блок и оставить только Tolgee. Без сегмента `[locale]`. |
| **`bodyParser: false` API** | [api/file.ts](src/pages/api/file.ts) и [api/user/parse/cv.ts](src/pages/api/user/parse/cv.ts): переписать на `request.formData()` / `request.body` ReadableStream. `maxDuration` на маршруте задаётся через `export const maxDuration`. |
| **`nextjs-progressbar`** | Заменить на `@bprogress/next` (есть App-Router-провайдер) или собственный хук на `usePathname`. |
| **`next-seo`** | Перейти на Metadata API: `export const metadata` / `generateMetadata`. 9 файлов. |
| **CSRF (`next-csrf`)** | Заменяем на `@edge-csrf/nextjs` (App Router native, Edge-runtime совместим). [helpers/csrf.ts](src/helpers/csrf.ts) переписывается на новый API. |
| **`vercel.json` functions glob** | Обновить на `src/app/api/**/route.ts` + `maxDuration` per-route. |
| **Turbopack** | Включаем сразу (`next dev --turbo`, `next build --turbo`). `@svgr/webpack` подключаем через `turbopack.rules` в [next.config.js](next.config.js). Webpack-блок оставляем как fallback, если упрёмся в несовместимость. |
| **`next/image` Image config** | `remotePatterns` синтаксис без изменений, проверить новые требования к `qualities` (Next 15+) — если используется `quality`, добавить в config. |

---

## 4. Этапы миграции

### Этап 0. Подготовка (1–2 дня)
Цель — минимизировать поверхность изменения, чтобы основной шаг был механическим.

- [ ] Работаем в текущей ветке `upgrade-to-16` поэтапными коммитами.
- [ ] Зафиксировать baseline: `npm run type-check`, `npm run lint`, `npm run build` на текущем `14.2.33`.
- [ ] Прогон существующих vitest-тестов: `npm test`.
- [ ] **Настроить Playwright с нуля** (в проекте сейчас его нет):
  - `npm i -D @playwright/test`, `npx playwright install`.
  - `playwright.config.ts` с baseURL из ENV (локально / staging), retries, html-reporter, два проекта (`chromium`, опционально `webkit`).
  - `tests/e2e/` директория, `tests/e2e/fixtures/` для авторизованного state (через `storageState`).
  - Скрипты в package.json: `test:e2e`, `test:e2e:ui`, `test:e2e:staging`.
  - Тест-пользователи: договориться, как их создавать на dev/staging (seed-скрипт или ENV-логин).
  - Зафиксировать "эталон поведения" baseline вручную: скриншоты ключевых страниц + чек-лист сценариев из §4 Этап 6 на текущем `14.2.33`. Это станет referenced-набором, по которому пишутся первые e2e тесты.
- [ ] **Написать первый smoke-набор** (без расчёта на «зелёный baseline» — потому что писать его буду уже параллельно с миграцией):
  - `home.spec.ts` — `/` грузится, hero виден.
  - `auth.spec.ts` — `/signin` → flow логина.
  - `hub.spec.ts` — `/hub` после логина.
  - `blog.spec.ts` — список + детальная.
  - `api.spec.ts` — `/api/courses`, `/api/events-count` возвращают 200.
  Эти тесты можно начать писать на baseline, чтобы убедиться, что они стабильны на текущей версии, **но это не блокер** — допустимо писать сразу против App Router версии страницы.
- [ ] Аудит deprecated API в коде:
  - `router.events` → 2 места ([_app.tsx](src/pages/_app.tsx), `BlogPostEditor`), отметить под рефакторинг.
  - `router.isReady` / `router.asPath` / `router.locale` — выписать список (грепом).
  - `next/head` — 3 файла, отметить под Metadata API.
- [ ] Зафиксировать список **внешних React-зависимостей**, не совместимых с React 19, через `npm ls react` и проверку peer-deps.
- [ ] Подготовить тонкий adapter [src/lib/route-handler-adapter.ts](src/lib/route-handler-adapter.ts):
  ```ts
  // pseudo
  export function toRouteHandler<T>(HandlerClass: new () => T) {
    const instance = new HandlerClass();
    return {
      GET:    (req, ctx) => callMethod(instance, 'get',    req, ctx),
      POST:   (req, ctx) => callMethod(instance, 'post',   req, ctx),
      PUT:    (req, ctx) => callMethod(instance, 'put',    req, ctx),
      PATCH:  (req, ctx) => callMethod(instance, 'patch',  req, ctx),
      DELETE: (req, ctx) => callMethod(instance, 'delete', req, ctx),
    };
  }
  ```
  с разбором `@Body`, `@Param`, `@Query`, middleware-цепочки из `next-api-decorators` и сопоставлением catch-all `[[...params]]`.

### Этап 1. Обновление зависимостей и Next.js (1 день)
- [ ] Поднять до последних совместимых версий:
  - `next` → `16.2.6`
  - `react` / `react-dom` → `^19`
  - `@types/react` / `@types/react-dom` → `^19`
  - `next-auth` → `^5` (Auth.js v5)
  - `antd`, `@ant-design/cssinjs`, `@ant-design/icons`, `@ant-design/x` → latest `^5`
  - `@tanstack/react-query`, `@tanstack/react-query-devtools` → latest `^5`
  - `eslint-config-next` → `^16`
  - Удалить: `next-seo`, `next-csrf`, `recoil`, `nextjs-progressbar`.
  - Добавить: `@edge-csrf/nextjs`, `@bprogress/next` (или эквивалент для App Router).
- [ ] Прогнать кодмоды:
  ```bash
  npx @next/codemod@latest upgrade latest
  ```
  (включает `next-async-request-api`, `next-image-to-legacy-image`, и т.д.)
- [ ] Зафиксировать `engines.node` в [package.json](package.json) → `">=20.9.0"`.
- [ ] Не запускать `next dev` — на этом этапе билд ожидаемо падает.

### Этап 1.5. Recoil → Zustand (отменён по факту аудита)
Recoil в коде не используется. Удаление пакета `recoil` выполняется в Этапе 1 одной строкой `yarn remove recoil`. Отдельный этап не нужен.

### Этап 2. Базовый App Router скелет + Turbopack + Auth.js v5 (1.5 дня) — App и Pages сосуществуют
> Next.js допускает одновременную работу `src/app/` и `src/pages/`. Это даёт пошаговую миграцию.

- [ ] Создать `src/app/layout.tsx` — копирует логику provider'ов из [_app.tsx](src/pages/_app.tsx):
  - `TolgeeProvider`, `QueryClientProvider`, `SessionProvider` (из Auth.js v5), `DefaultSeo` → Metadata API в `metadata` экспорте.
  - `CookieConsent`, `LoadingScreen`, прогрессбар (`@bprogress/next`) → клиентский компонент-обёртка.
- [ ] Создать `src/app/providers/AntdRegistry.tsx` (client-component с `useServerInsertedHTML` из `next/navigation` для AntD cssinjs SSR).
- [ ] Перенести `globals.scss` → `app/globals.scss`.
- [ ] Создать `app/not-found.tsx` (бывший [404.tsx](src/pages/404.tsx)) и `app/error.tsx`.
- [ ] Перенести `sitemap.xml.ts` → `app/sitemap.ts`.
- [ ] Обновить [next.config.js](next.config.js):
  - удалить `i18n`,
  - перенести `experimental.serverComponentsExternalPackages` → `serverExternalPackages` (если используется),
  - добавить `turbopack: { rules: { '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' } } }`,
  - оставить webpack-блок как fallback.
- [ ] Включить Turbopack в скриптах:
  ```json
  "dev":   "next dev --turbo",
  "build": "next build --turbo"
  ```
- [ ] **Auth.js v5 миграция**:
  - Создать `src/auth.ts` с фабрикой `NextAuth({...})` → экспорт `{ handlers, auth, signIn, signOut }`.
  - Перенести конфиг провайдеров из `pages/api/auth/[...nextauth].ts`.
  - Создать `src/app/api/auth/[...nextauth]/route.ts` → `export const { GET, POST } = handlers`.
  - Удалить старый `pages/api/auth/[...nextauth].ts`.
  - Обновить [src/middleware.ts](src/middleware.ts) → использовать `auth` wrapper вместо `withAuth`.
  - Везде, где `getServerSession(authOptions)` → `auth()` (16 файлов).
  - Везде, где `useSession()` (client) — без изменений (API совместим).
- [ ] **Проверка**: `next build --turbo` собирается с пустым `app/` layout, существующими pages и новой Auth.js v5.
- [ ] **Ручной smoke** ключевых страниц + Playwright smoke (если уже написан).

### Этап 3. Миграция страниц (5–8 дней) — посегментно
Порядок (от простого к сложному, чтобы быстрее ловить регрессии):

1. **Статика без auth** (1 день): `index.tsx`, `cookie-policy.tsx`, `privacy-policy.tsx`, `legal-details.tsx`, `events.tsx`, `404.tsx`, `test-seo.tsx`, `ui-test.tsx`.
2. **Публичные с динамикой** (1.5 дня): `blog/*`, `event/[slug]`, `expert/[specialityId]`, `project/[projectSlug]`, `projects/*`, `verify/*`, `devlog/*`, `job/*`, `jobs/*`, `courses/*`.
3. **Auth flows** (1 день): `signin/*`, `registration/*`, `invite/*`.
4. **Protected `hub`** (1.5 дня): сначала `hub/layout.tsx` + `hub/page.tsx`, затем вложенные группы:
   - `(projects)/layout.tsx` + `projects/`, `project/[projectSlug]/`
   - `(events)/layout.tsx` + `events/`, `event/[slug]/`
   - `(courses)/layout.tsx` + `courses/`, `courses/[slug]/`
   - `hub/docs/[[...slug]]/`, `hub/members/`
5. **Protected прочее** (1 день): `my/*`, `profile/*`, `live/*`.
6. **Admin** (1 день): `admin/*`, `_dev/*`.

Для каждой страницы:
- Заменить `getServerSideProps` → async `page.tsx` Server Component (прямой вызов БД через Prisma, `auth()` для сессии).
- Заменить `getStaticProps` → Server Component с `fetch.revalidate` или `generateStaticParams`.
- Извлечь client-логику в подкомпонент с `"use client"`.
- Заменить `next/head` / `NextSeo` → `export const metadata` / `generateMetadata`.
- Заменить `useRouter` Pages → `useRouter` / `usePathname` / `useSearchParams` / `useParams` из `next/navigation`.
- `getLayout` → переехать в `(group)/layout.tsx`.
- **Написать Playwright e2e тест** на критичные сценарии раздела (раз тестов ещё нет — пишем сразу против новой App Router версии). Минимум: happy-path + 1–2 edge case (404, неавторизованный доступ).
- Удалить старый файл из `src/pages/` **после** прохождения e2e + ручной проверки.

### Этап 4. Миграция API на native Route Handlers (5–7 дней)

> Главная архитектурная часть: декораторы из `next-api-decorators` уходят, всё переезжает на нативные App Router идиомы. Может идти параллельно с Этапом 3, начиная с Auth.js v5 в Этапе 2 (то уже сделано).

#### 4.1. Библиотека HOF-middleware (0.5 дня)
Создать [src/lib/api-handlers.ts](src/lib/api-handlers.ts) с композируемыми обёртками:

```ts
type Locals = { user?: SessionUser; team?: Team; body?: unknown };
type Handler<L extends Locals = Locals> =
  (req: NextRequest, ctx: { params: Promise<Record<string,string>> }, locals: L) => Promise<Response>;

export const withAuth = (opts?: { roles?: UserRole[]; mode?: "user"|"any"|"api"|"public_api"|"vercel_cron" }) =>
  <L extends Locals>(handler: Handler<L & { user: SessionUser }>): Handler<L> => ...;

export const withTeamGuard = () =>
  <L extends Locals>(handler: Handler<L & { team: Team }>): Handler<L> => ...;

export const withValidation = <S extends z.ZodSchema>(schema: S, source: "body"|"query" = "body") =>
  <L extends Locals>(handler: Handler<L & { body: z.infer<S> }>): Handler<L> => ...;

// Композиция: pipe(withAuth(), withValidation(Schema))(handler)
export const pipe = (...wrappers) => (handler) => wrappers.reduceRight((h, w) => w(h), handler);
```

Покрывает все текущие декораторы:
- `@NextAuthGuard(mode, roles?)` → `withAuth({ mode, roles })`
- `@ApiProjectTeamGuard()` → `withTeamGuard()`
- `@Body(ValidationPipe) dto: Dto` → `withValidation(Schema, "body")` + переход class-validator → **Zod** (zod уже в зависимостях).
- `@Query(ValidationPipe) dto: Dto` → `withValidation(Schema, "query")`
- `@Param("id")` → `ctx.params.id` (native).
- `@Req()` → доступ к user через `locals.user`.

#### 4.2. Перевод class-validator DTO на Zod (1 день, параллельно с 4.3)
- ~70 DTO-классов с `@IsString/@IsNumber/@IsBoolean/@IsEnum/@Min` декораторами.
- Кодомод (или вручную): каждый DTO → Zod-схема в [src/schemas/](src/schemas/).
- Например:
  ```ts
  // было
  class CreateCourseDto { @IsString() name: string; @IsBoolean() agreedToTerms: boolean; }
  // стало
  export const CreateCourseSchema = z.object({
    name: z.string(),
    agreedToTerms: z.boolean(),
  });
  ```
- Удалить `class-validator`, `class-transformer` из зависимостей.

#### 4.3. Разделение catch-all routes на нативные сегменты (2 дня)
22 файла `[[...params]].ts` содержат внутренний суброутинг через `@Put("/:id/publish")` и т.п. Каждый разрезается на отдельные `route.ts`.

Пример: [src/pages/api/user/course/[[...params]].ts](src/pages/api/user/course/[[...params]].ts) с эндпоинтами `POST /`, `PUT /:id/publish`, `PUT /:id/unpublish`, `DELETE /` → 

```
src/app/api/user/course/route.ts                 (POST, DELETE)
src/app/api/user/course/[id]/publish/route.ts    (PUT)
src/app/api/user/course/[id]/unpublish/route.ts  (PUT)
```

#### 4.4. Миграция handler-файлов (2–3 дня)
Для каждого Pages-handler:
1. Создать соответствующий `app/api/.../route.ts`.
2. Экспортировать `GET/POST/PUT/DELETE` через композицию HOF + чистая бизнес-логика:
   ```ts
   export const POST = pipe(
     withAuth({ mode: "user" }),
     withValidation(CreateCourseSchema),
   )(async (req, ctx, { user, body }) => {
     const course = await prisma.course.create({ data: { ...body, createdById: user.id } });
     return NextResponse.json(course);
   });
   ```
3. Удалить старый файл из `src/pages/api/`.
4. Если в handler был `getServerSession(authOptions)` — заменить на `auth()` из Auth.js v5 (см. Этап 2).

#### 4.5. Особые случаи
- `pages/api/auth/[...nextauth].ts` → сделано в Этапе 2 (Auth.js v5).
- [pages/api/file.ts](src/pages/api/file.ts), [pages/api/user/parse/cv.ts](src/pages/api/user/parse/cv.ts):
  - Убрать `bodyParser: false` + `formidable`/`multer`.
  - Использовать `request.formData()` → `formData.get("file") as File` → `file.stream()` для стрима в S3.
  - `maxDuration` → `export const maxDuration = 300` в route.ts.
- `pages/api/og*.tsx` (`@vercel/og`): API не меняется, файл переезжает в `app/api/og/route.tsx` (или сохраняем структуру `og-event-big`/`og-event-small`/`og-job`).
- CRON `/api/cron/*` — переезжают как обычные Route Handlers, URL остаётся.

#### 4.6. Конфиг
- Обновить [vercel.json](vercel.json):
  ```json
  "functions": {
    "src/app/api/**/route.ts": { "maxDuration": 300 }
  }
  ```
  Убрать pages glob.
- Удалить `experimentalDecorators` / `emitDecoratorMetadata` из [tsconfig.json](tsconfig.json) (больше не нужны без `next-api-decorators` / `class-validator`).

#### 4.7. CSRF
Переписать [helpers/csrf.ts](src/helpers/csrf.ts) на `@edge-csrf/nextjs`, использовать в middleware и `withAuth`/`withCsrf`-обёртке.

#### 4.8. Удаление пакетов
После полной миграции — `yarn remove next-api-decorators class-validator class-transformer reflect-metadata next-csrf formidable multer`.

### Этап 5. Middleware, Auth.js, Tolgee, CSRF (0.5 дня)
- [ ] [src/middleware.ts](src/middleware.ts): переписать с `withAuth` next-auth@4 на `auth` wrapper из Auth.js v5 (сделано в Этапе 2, проверить покрытие всех редиректов).
- [ ] Tolgee SSR: использовать серверную инициализацию в `app/layout.tsx`, без `useTolgeeSSR(router.locale)` (теперь один локаль).
- [ ] CSRF: переписать [helpers/csrf.ts](src/helpers/csrf.ts) на `@edge-csrf/nextjs`, подключить в middleware.

### Этап 6. Тесты, типы, билд (1.5 дня)
- [ ] `npm run type-check` — пройти полностью.
- [ ] `npm run lint` — пройти.
- [ ] `npm test` — vitest должен пройти; некоторые тесты импортируют из `src/pages/api/**` — обновить пути на `src/app/api/**`.
- [ ] **Довести Playwright покрытие** до полноценного e2e набора (тесты пишутся с нуля, накопительно по ходу Этапа 3 и финально дополняются здесь):
  - public: home, blog/list+detail, courses/list+detail, event/detail, expert/detail, project/detail.
  - auth: signin (email+google mocked), registration onboarding flow.
  - protected: hub overview, hub/projects, hub/events, hub/courses, my/events, profile/settings.
  - admin: смоук-тест ключевых разделов.
  - api: file upload (`/api/file`), CV parse (`/api/user/parse/cv`), `/api/courses`, NextAuth callback.
  - OG: `/api/og-event-big`, `/api/og-job`.
- [ ] `npm run build --turbo` локально — должен собраться.
- [ ] Прогон Playwright на staging.

### Этап 7. Очистка (0.5 дня)
- [ ] Удалить `src/pages/` целиком (после полной миграции).
- [ ] Удалить `_app.tsx`, `_document.tsx`, `src/layouts/` (всё переехало в `app/.../layout.tsx`).
- [ ] Удалить из package.json: `next-seo`, `next-csrf`, `nextjs-progressbar`, `recoil`, `formidable`, `multer` (если file upload переписан на `formData()`), `@next-auth/prisma-adapter` (если v5 использует другой адаптер).
- [ ] `next-api-decorators` остаётся (через адаптер).
- [ ] `experimentalDecorators` в tsconfig оставить (нужен для `next-api-decorators`).
- [ ] Обновить [docs/](docs/) и `CLAUDE.md` (если есть).
- [ ] Финальный прогон Playwright на staging → проде.

---

## 5. Принятые решения

| # | Вопрос | Решение |
|---|---|---|
| 1 | `next-api-decorators` | **Удаляется полностью**. Все API мигрируют на native Route Handlers, декораторы заменяются HOF-middleware (`withAuth`, `withTeamGuard`, `withValidation` и т.д.). Адаптер `toRouteHandler` остаётся как утилита для нестандартных случаев. |
| 2 | NextAuth v4 → Auth.js v5 | Мигрируем сразу, в Этапе 2. |
| 3 | Turbopack | Включаем сразу для `dev` и `build`. Webpack — fallback. |
| 4 | `recoil` | Удаляем, всё на `zustand` (Этап 1.5). |
| 5 | Стратегия PR | Поэтапные коммиты в текущей ветке `upgrade-to-16`. |
| 6 | CSRF | `@edge-csrf/nextjs`. |
| 7 | Тестовое окружение | Staging — есть, прокатываем перед прод-выкаткой. |
| 8 | E2E | Playwright **с нуля** (сейчас не настроен и тестов нет). Setup в Этапе 0, тесты пишутся накопительно по ходу миграции, финальный прогон в Этапе 6. Baseline-набора на 14.2.33 нет — за эталон берём ручную проверку + скриншоты. |
| 9 | Зависимости | Обновляем `antd`, `@ant-design/*`, `react-query`, остальные пакеты до последних совместимых с Next 16 / React 19. |

---

## 6. Оценка трудоёмкости

| Этап | Дни |
|---|---|
| 0. Подготовка, baseline, Playwright setup | ✅ done |
| 1. Обновление пакетов | 1 |
| ~~1.5. Recoil → Zustand~~ | отменён (recoil не используется) |
| 2. App Router скелет + Turbopack + Auth.js v5 | 1.5 |
| 3. Миграция страниц (67 файлов) | 5–8 |
| 4. Миграция API на native Route Handlers (130 файлов + HOF lib + Zod) | 5–7 |
| 5. Middleware/Auth/Tolgee/CSRF | 0.5 |
| 6. Тесты, e2e, билд | 1.5 |
| 7. Очистка | 0.5 |
| **Итого (без 0)** | **14.5–20 рабочих дней** |

С буфером на риски (несовместимые зависимости React 19, edge-cases Auth.js v5, Turbopack-ошибки, объём DTO под Zod) — **~4 недели** на одного человека.

---

## 7. Точка возврата (rollback)

- Вся миграция идёт в ветке `upgrade-to-16`, поэтапными коммитами.
- Pages и App Router могут сосуществовать → можно остановиться на любом этапе и смержить частичную миграцию (например, только API), если такое решение примем.
- Бэкап БД не требуется (схема не меняется).
- Playwright-набора на baseline нет → якорем для отката служат: (а) ручной чек-лист со скриншотами на `14.2.33`, (б) накопительно растущий e2e набор, который должен оставаться зелёным после каждого этапа начиная с того момента, как написан первый тест.

---

**Готов стартовать с Этапа 0.**
