# Этап 1 — Сводка апгрейда пакетов

## Что сделано

### Удалено
- `recoil` (не используется в коде)
- `next-seo` (заменяется на Metadata API)
- `nextjs-progressbar` (заменяется на `@bprogress/next` в Этапе 2)
- `next-csrf` (заменяется на `@edge-csrf/nextjs`)
- `@next-auth/prisma-adapter` (заменяется на `@auth/prisma-adapter`)
- `next-auth@4`

### Обновлено
| Пакет | Было | Стало |
|---|---|---|
| `next` | 14.2.33 | **16.2.6** |
| `react` | 18.3.1 | **19.2.6** |
| `react-dom` | 18.3.1 | **19.2.6** |
| `@types/react` | 18.2.63 | **19.2.15** |
| `@types/react-dom` | 18.0.6 | **19.2.3** |
| `eslint-config-next` | 15.2.4 | **16.2.6** |
| `antd` | 5.27.4 | **6.4.3** (major!) |
| `@ant-design/cssinjs` | 1.24.0 | **2.1.2** (major) |
| `@ant-design/icons` | 6.0.0 | 6.2.3 |
| `@ant-design/x` | 1.6.1 | **2.7.0** (major) |
| `@ant-design/happy-work-theme` | 1.0.0 | 2.0.0 (major) |
| `@ant-design/colors` | 8.0.0 | 8.0.1 |
| `antd-img-crop` | 4.25.0 | 4.30.0 |
| `@tanstack/react-query` | 5.87.4 | 5.100.11 |
| `@tanstack/react-query-devtools` | 5.87.4 | 5.100.11 |
| `@daily-co/daily-react` | 0.17.3 | **0.25.2** (дропнул recoil → jotai) |
| `@daily-co/daily-js` | 0.60.0 | 0.90.0 |

### Добавлено
- `next-auth@5.0.0-beta.31` (Auth.js v5)
- `@auth/prisma-adapter@2.11.2`
- `@edge-csrf/nextjs@2.5.3-cloudflare-rc1`
- `jotai@2.20.0` (peer-dep новой `@daily-co/daily-react`)

### Конфиг
- [package.json](package.json): добавлено `"engines": { "node": ">=20.9.0" }`.

### Codemods
Прогнаны несколько потенциально применимых codemod'ов из `@next/codemod@16.2.6`:

| Codemod | Файлов | Результат |
|---|---|---|
| `next-async-request-api` | 466 | 0 модификаций — ожидаемо (наш код в Pages Router, codemod таргетит App Router API). |
| `middleware-to-proxy` | 466 | 0 модификаций — наш [middleware.ts](src/middleware.ts) уже совместим с Next 16 proxy-форматом. |
| `next-og-import` | 466 | dry-run обещал 10 модификаций, но при применении не выполнял основную замену (`@vercel/og` остался), зато менял табы на пробелы и убирал `import type` → понижение качества кода. **Пропустили, откатили.** |

**Итог по codemods**: для нашего сценария (Pages Router → App Router скачок) codemod'ы дают мало пользы. Они полезнее для проектов, уже находящихся в App Router и поднимающих минорные версии. Основная работа по миграции — ручная (с поддержкой плана и HOF-адаптеров).

`next-async-request-api` можно будет прогнать ещё раз в Этапе 3, когда появится код в `src/app/` — он точечно расставит `await cookies()/headers()/params/searchParams`.

## Текущее состояние

- ✅ `npm install` (через yarn) проходит, husky установлен.
- ✅ `npm run lint` — зелёный (472 файла, 0 ошибок).
- ❌ `npm run type-check` — **59 ошибок**, все ожидаемые. Категоризированы ниже.

## Type-check ошибки по категориям (59 шт.)

| Категория | Кол-во | Будет починено в |
|---|---|---|
| `next-seo` отсутствует | 9 | Этап 2/3 (Metadata API) |
| `nextjs-progressbar` отсутствует | 1 | Этап 2 (`@bprogress/next`) |
| `next-csrf` отсутствует | 1 | Этап 5 (`@edge-csrf/nextjs`) |
| Auth.js v5: `getServerSession` → `auth()` | 16+ | Этап 2 (Auth.js v5 wiring) |
| Auth.js v5: `NextAuthOptions`/`TokenSet` нет | 2 | Этап 2 |
| Auth.js v5: `next-auth/middleware` `withAuth` нет | 1 | Этап 2 |
| Auth.js v5: `httpOptions` Google provider нет | 1 | Этап 2 |
| `@next-auth/prisma-adapter` → `@auth/prisma-adapter` | 1 | Этап 2 |
| AntD 6: `Conversation` → `Conversations`, `BubbleDataType` импорт | 2 | Этап 3 |
| AntD 6: `messageRender` API, `destroyOnClose` → `destroyOnHidden`, `Modal.confirm content` | 4 | Этап 3 |
| AntD 6: `cssinjs.hashed: true` API изменилось | 2 | Этап 2 (config) |
| react-query 5+: `invalidateQueries()` требует args | 5 | Этап 3 |
| Misc (типизации, `Dayjs | null`) | ~5 | Этап 3 |

## Известные peer-dependency предупреждения (не блокеры в yarn 1)

- `@9gustin/react-notion-render@3.11.4` — strict `react@^18.2.0`. Используется в 4 файлах. Если порвётся в рантайме — заменим в Этапе 3.
- `html-react-parser@1.4.14` (транзитив через `editorjs-blocks-react-renderer`) — `react@<=18`. Низкий риск (используется только в рендере EditorJS).
- `next-auth@5.0.0-beta` — beta-релиз. План §6 уже учитывает риск edge-cases.
- `eslint-config-next@16.2.6` требует `eslint@>=9`, у нас `eslint@8.57`. ESLint у нас не используется в pipeline (lint через biome). Можно либо поднять до eslint@9, либо удалить eslint полностью (biome покрывает). Решим в Этапе 7 (cleanup).

## Что **не** делалось в этом этапе

- Auth.js v5 конфиг (`auth.ts`) — Этап 2.
- App Router скелет (`app/layout.tsx`) — Этап 2.
- Turbopack включение — Этап 2.
- AntD 6 — переход на новые API — Этап 3 при миграции страниц.
- Замена `next-seo` на Metadata API — Этап 2/3.

## Следующий шаг

Этап 2: App Router скелет + Turbopack + Auth.js v5 wiring. Сразу решит большинство type-check ошибок.
