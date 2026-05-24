# Baseline-чеклист (Next.js 14.2.33)

> Используется как «эталон поведения» до миграции. Перед стартом Этапа 1 нужно вручную пройти по этому чеклисту, снять скриншоты, сложить в `docs/baseline-screenshots/`.
>
> После каждого этапа миграции сверяем поведение с этим чеклистом + диффим скриншоты.

## Как фиксировать
1. Запустить локально: `yarn dev` (или прод-сборку `yarn build && yarn start`).
2. Для каждого пункта ниже — открыть страницу, проверить функциональность, снять скриншот: `Cmd+Shift+4` → выделить весь окно браузера в 1280×800.
3. Положить в `docs/baseline-screenshots/<section>/<page>.png`.

## Public

- [ ] `/` — главная грузится, hero виден, нет console-ошибок.
- [ ] `/blog` — список постов, пагинация.
- [ ] `/blog/<slug>` — открывается один пост.
- [ ] `/events` — список событий.
- [ ] `/event/<slug>` — открывается одно событие.
- [ ] `/expert/<specialityId>` — карточка эксперта.
- [ ] `/project/<projectSlug>` — карточка проекта.
- [ ] `/projects` — список проектов.
- [ ] `/jobs` — список вакансий.
- [ ] `/job/<vacancyId>` — карточка вакансии.
- [ ] `/courses` — список курсов.
- [ ] `/courses/<slug>` (если есть прямой публичный URL — иначе пропускаем).
- [ ] `/devlog/<projectReportId>` — пост devlog.
- [ ] `/verify` / `/verify/<number>` — публичная страница верификации.
- [ ] `/cookie-policy`, `/privacy-policy`, `/legal-details` — статические страницы.
- [ ] `/404` — отображается no-match страница на несуществующий URL.

## Auth flows

- [ ] `/signin` — форма логина email.
- [ ] Логин через email — приходит письмо, переход по ссылке логинит.
- [ ] Логин через Google — OAuth-флоу работает.
- [ ] `/registration/onboarding` — онбординг открывается для нового пользователя.
- [ ] `/invite/<token>` — инвайт принимается.
- [ ] Выход (`signOut`) — возврат на `/signin`.
- [ ] Защита: попытка открыть `/hub` без сессии → редирект на `/`.

## Hub (protected)

- [ ] `/hub` — дашборд hub'а.
- [ ] `/hub/projects` — список проектов hub.
- [ ] `/hub/project/<slug>` — карточка проекта hub.
- [ ] `/hub/events` — события hub.
- [ ] `/hub/event/<slug>` — событие hub.
- [ ] `/hub/courses` — курсы.
- [ ] `/hub/courses/<slug>` — курс с уроками.
- [ ] `/hub/docs/<path>` — Notion-документы.
- [ ] `/hub/members` — список участников.
- [ ] `/hub/jobs` — вакансии hub.

## My / Profile

- [ ] `/my/events` — мои события.
- [ ] `/my/events/<eventId>` — детали моего события.
- [ ] `/profile/settings/general` — настройки профиля.
- [ ] `/profile/settings/<other-tabs>` — каждый таб настроек.

## Live (DemoDay/ProtectedEvent)

- [ ] `/live/<eventSlug>` — landing live.
- [ ] `/live/room/...` — комната (если есть тестовый event).

## Admin

- [ ] `/admin` — дашборд админки.
- [ ] `/admin/post/<id>` — редактор поста (важно: проверить confirm-on-leave в BlogPostEditor).
- [ ] `/admin/devlog-post/<id>` — редактор devlog.
- [ ] `/admin/workflow/<id>` — редактор workflow.

## API smoke (через curl или DevTools)

- [ ] `GET /api/courses` → 200, JSON-массив.
- [ ] `GET /api/events-count` → 200.
- [ ] `GET /api/experts` → 200.
- [ ] `GET /api/projects` → 200.
- [ ] `POST /api/file` (multipart upload) → 200, файл загружается на S3.
- [ ] `POST /api/user/parse/cv` (multipart PDF) → парсит CV.
- [ ] `GET /api/sitemap.xml` → XML.
- [ ] `GET /api/og-event-big?id=<eventId>` → PNG.
- [ ] `GET /api/og-job?id=<vacancyId>` → PNG.
- [ ] `GET /api/auth/session` → возвращает сессию.

## CRON (через curl с `Authorization: Bearer $CRON_SECRET`)

- [ ] `GET /api/cron/devlog-reminder` → 200.
- [ ] `GET /api/cron/advice-request-reminder` → 200.
- [ ] `GET /api/cron/event-reminder` → 200.
- [ ] `GET /api/cron/project-status-maintenance` → 200.

## Известные пре-существующие issues (на baseline)

- `vitest` падает: 7 тестов из 17 (моки `next-auth` неактуальны, query mismatch). Не блокер — переписывается после миграции.
- В `_app.tsx` `router.events.on` логирует только в dev-mode (не влияет на пользователя).
- `BlogPostEditor` использует `router.events.emit("routeChangeError")` для блокировки навигации — это работает в Pages Router, поведение должно сохраниться после миграции (через `beforeunload` + custom link-interceptor).
