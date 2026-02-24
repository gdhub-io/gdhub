# Skill Capital v1 — 3 трека + Total

> Цель: зафиксировать единую модель Skill Capital для ролей в экосистеме: автор, участник команды (core), эдвайзор, инвестор (зарезервировано).

## 1. Роли и принципы

### Роли
- Автор (`author`): инициирует и ведет проект, отвечает за стратегию и исход.
- Участник команды (`core`): выполняет продуктовую/техническую работу в проекте.
- Эдвайзор (`advisor`): консультирует по запросам, вклад измеряется в сессиях.
- Инвестор (`investor`): роль зарезервирована для будущих версий модели.

### Главные принципы
- Вклад каждой роли считается отдельно.
- Роли не смешиваются в одной метрике.
- Система поощряет завершение, а не «вечную активность».
- Должны быть антифрод-ограничения.

## 2. Структура Skill Capital

```text
SC_total = LC_total + EC_total + MC_total
SC_total_future = LC_total + EC_total + MC_total + IC_total
```

Где:
- `LC_total` — Leadership Capital (автор).
- `EC_total` — Execution Capital (core).
- `MC_total` — Mentorship Capital (эдвайзор).
- `IC_total` — Investor Capital (зарезервировано, не участвует в v1).

Правило v1:
- `IC_total` хранится как архитектурный placeholder.
- `SC_total` в расчетах и UI v1 не включает `IC_total`.

## 3. Leadership Capital (LC)

Считается только по проектам, где пользователь является автором.

```text
LC(project) = ActiveDays
              * EntryStageCoef
              * LeadershipRoleCoef
              * OutcomeCoef
```

Константы:
- `LeadershipRoleCoef = 1.3`

`OutcomeCoef`:
- `RELEASED = 1.5`
- `KILLED_WITH_DIGNITY = 1.1`
- `ARCHIVED = 0.6`
- `DORMANT = 0.8`
- `ACTIVE/APPROVED = 1.0`

Бонус завершения:
```text
RI_author = Released_as_author / (Started_as_author - KilledWithDignity_as_author)
LeadershipFinishBonus = RI_author * 100
LC_total = Σ LC(project) + LeadershipFinishBonus
```

## 4. Execution Capital (EC)

Считается по проектам, где пользователь является участником команды (не автор).

```text
EC(project) = ActiveDays
              * EntryStageCoef
              * CoreRoleCoef
              * OutcomeCoef
```

Константы:
- `CoreRoleCoef = 1.0`
- `OutcomeCoef` — такой же, как в LC.

Бонус глубины:
```text
StageDepthScore = distinctStagesTouched / MaxStages
StageDepthBonus = StageDepthScore * 50
EC_total = Σ EC(project) + StageDepthBonus
```

## 5. Mentorship Capital (MC)

Считается по проектам, где пользователь является эдвайзором.

Базовая единица:
- `1 accepted+completed request = 1 session = 30 минут = 0.5 часа`
- `4 часа = 1 эквивалентный активный день`
- Значит `1 session = 0.125 days`

Формула:
```text
AdvisorDaysEquivalent = AcceptedCompletedSessions * 0.125
MC(project) = AdvisorDaysEquivalent
              * AdvisorRoleCoef
              * OutcomeCoef_advisor
```

Константы:
- `AdvisorRoleCoef = 0.5`
- `OutcomeCoef_advisor = 1.2`, если проект `RELEASED`
- `OutcomeCoef_advisor = 1.0` для остальных статусов

Итог:
```text
MC_total = Σ MC(project)
```

## 6. Единые определения для расчетов

### ActiveDays
- Считаются только периоды, когда проект был в активном статусе (`APPROVED/ACTIVE`).
- В `DORMANT`, `ARCHIVED`, `REJECTED`, `REGISTERED` новые дни не начисляются.

### EntryStageCoef
Рекомендуемая шкала v1:
- `IDEATION = 1.5`
- `PROTOTYPE = 1.2`
- `VERTICAL_SLICE/DEMO = 1.1`
- `MVP = 1.0`
- `RELEASE = 0.8`

## 7. Антифрод и ограничения

Для эдвайзоров учитывать только:
- запросы со статусом `Accepted` и `Completed`;
- с подтверждением от автора (минимум 1 подтверждение);
- не более `4` сессий в неделю на одного эдвайзора в рамках одного проекта (cap v1).

Для всех ролей:
- исключать дубликаты событий;
- не считать активность в отклоненных/незапущенных проектах.

## 8. Отображение в UI

Показывать 4 значения:
- `Leadership Capital`
- `Execution Capital`
- `Mentorship Capital`
- `Total Skill Capital`

Не показывать в v1:
- `Investor Capital` (роль и формулы зарезервированы для следующих версий).

Пример блока:

```text
Leadership Capital    420
Execution Capital     310
Mentorship Capital     88
---------------------------
Total Skill Capital   818
```

Важно:
- не сравнивать напрямую абсолютные значения `LC` и `MC` как «кто лучше»;
- в следующих версиях добавить percentile/rank внутри роли.

## 9. Что нужно сделать в разработке (Scope v1)

1. Зафиксировать роли в расчете: `author`, `core`, `advisor`.
2. Подготовить источники данных:
- активные дни участия;
- стадия входа в проект;
- итоговый статус проекта;
- число `accepted+completed` advisory-запросов.
3. Реализовать вычислитель `LC`, включая `RI_author` и `LeadershipFinishBonus`.
4. Реализовать вычислитель `EC`, включая `StageDepthBonus`.
5. Реализовать вычислитель `MC` с переводом сессий в эквивалент дней.
6. Добавить антифрод-правила для advisory-сессий (confirmation + weekly cap).
7. Заложить в модель зарезервированный трек `investor` без активной формулы:
- подготовить типы/DTO/контракты для `IC_total`;
- в v1 возвращать `IC_total = 0` или `null` (единое решение в API).
8. Собрать агрегатор:
- `LC_total`, `EC_total`, `MC_total`, `SC_total`.
9. Обновить API профиля/рейтинга, чтобы отдавать все 4 значения + breakdown.
10. Обновить UI профиля: три шкалы + total (без Investor Capital).
11. Добавить тесты:
- unit на формулы;
- edge-cases (нулевые знаменатели в RI, dormant/archived);
- cap по сессиям эдвайзора.

## 10. Investor Capital (Reserved, vNext)

Статус:
- формула и коэффициенты не утверждены;
- в v1 не отображается и не влияет на `SC_total`.

Техническое правило на сейчас:
- сохранить расширяемость контрактов (`IC_total` в доменной модели/DTO);
- не включать `IC_total` в ранжирование и публичные метрики v1.

## 11. Open Questions перед реализацией

1. Какие точные статусы проекта являются «активными» в коде (`APPROVED` vs `ACTIVE`)?
2. Нужно ли исключать автора из `EC` на его собственном проекте (рекомендуется: да)?
3. Где хранится подтверждение advisory-сессии автором и есть ли миграция?
4. Нужна ли версия `SC_v1` в БД/API для последующей смены формул без поломки истории?
5. Для `IC_total` в API v1 лучше `0` или `null`?
