# GDHUB-140 — One test project, E2E Test Game, across the lab, the unit tests and the e2e suite

[Linear](https://linear.app/gdhub/issue/GDHUB-140/checkpoints-one-test-project-e2e-test-game-across-the-ai-curator-lab) · intent written 2026-11-04

## Want

Every checkpoint and project-creation check reads the same project, E2E Test Game. Its road is known in advance, so a review or a verdict can be read against what really happened. Quality can then be tracked from one run to the next: the lab, the unit tests and the e2e suite all tell the same story.

E2E Test Game is a classic 2D side-scrolling platformer: run, jump, stomp, collect, reach the flag. A gnome saves Christmas and collects candies, and the villain has kidnapped the Snow Maiden. Nothing in it is invented beyond the genre.

## Why now

The lab already has E2E Test Game for two situations (GDHUB-133), but its other eight situations still run on Hollow Tide, and the unit tests and e2e personas use Hollow Tide too. Two projects mean two stories, so a review on one cannot be compared with a review on the other. Hollow Tide also covers only one checkpoint. Nothing yet shows a project going through several stages, every direction and every verdict, people joining and leaving, or hours being cut.

## The road

Nine checkpoints, from the idea to the release: the road ends with the game out on Steam. The team starts as Ana (programmer, 15–20 h) and Bo (2D artist, 10–15 h). All of the game's content (devlogs, artifacts, tasks, notes) is in English. The data is in `src/services/checkpoints/ai-curator-lab/situations/e2e-road.ts`.

| # | Stage | Dates | Sprints (directions) | People | Verdict |
|---|---|---|---|---|---|
| 1 | Ideation | 3–30 Aug 2026 | toward · toward · sideways (lore instead of the one-pager) · toward | Ana, Bo | `StageClosed` |
| 2 | Concepting | 31 Aug – 27 Sep | toward · stalled (the same mood board recoloured) · toward · toward | Cleo (sound, 5–10 h) joins in sprint 2 | `StageClosed` |
| 3 | Prototyping | 2–29 Nov | toward · sideways (title screen) · idle · toward | Bo cuts his hours to 5–10; a level designer is sought | `GoalMissed`: two friends played, not five strangers |
| 4 | Prototyping, again | 7 Dec – 3 Jan 2027 | toward · toward · stalled · toward | Dan (level designer) is hired in sprint 1; Cleo leaves in sprint 3 | `StageClosed` |
| 5 | Preparing a demo version | 11 Jan – 7 Feb | toward · sideways (trailer before the build) · toward · toward | Ana, Bo, Dan | `GoalMet`: the demo is on itch.io, but the stage also asks for a live Steam page |
| 6 | Preparing a demo version, again | 15 Feb – 14 Mar | toward · stalled (waiting for Steam's review) · toward · toward | | `StageClosed`: the Steam page is live with the demo |
| 7 | Taking and analyzing metrics | 22 Mar – 18 Apr | toward · stalled (waiting for wishlists) · toward · toward | Bo's hours come back to 10–15 | `StageClosed`: levels 7–8 cut, the full game is six levels |
| 8 | Preparing a release version | 26 Apr – 23 May | toward · toward · idle · sideways (a boss nobody planned) | Ana cuts her hours to 10–15 in sprint 2 | `GoalMissed`: content not locked |
| 9 | Preparing a release version, again | 31 May – 27 Jun | toward · toward · toward · toward | | `StageClosed`: released on Steam |

A `GoalMet` verdict keeps the project on its stage, so after checkpoint 5 there is a second demo checkpoint. That is why the road has nine checkpoints, not the eight first drafted.

## Stages of the work (one task, PRs in a row, each into `dev`)

1. **The lab.**
   - The other eight situations move onto E2E Test Game: goal check, tasks check, plan letter, plan advice, sprint review, evidence, report, the whole road.
   - The data grows into the road above: devlogs, artifacts, the team and the pictures for every checkpoint.
   - "The whole road" walks all nine checkpoints, or any one of them.
   - Hollow Tide is removed from the lab.
2. **Unit tests.** Checkpoint and project-creation fixtures that name Hollow Tide read E2E Test Game instead. That is about twelve test files.
3. **e2e.**
   - `tests/personas.ts` and `bun run test-env` seed the project as E2E Test Game.
   - The 112 cassettes in `tests/e2e/cassettes` are keyed by prompt text, so they are re-recorded with real model calls. That costs a few dollars and takes one e2e run on the stand, and it starts only after Dmitry's OK.

## Constraints

- **The lab keeps using production code.** Same prompts, same schemas, same services. Only the situations' data changes.
- **One source.** The road lives in `src/services/checkpoints/ai-curator-lab/situations/e2e-test-game.ts`, and lab situations, tests and seeds read from it. Nothing keeps its own copy of the story.
- **Each call sees only what existed on its day**, as the lab's timeline already guarantees.
- **The lab stays dev-only** and writes nothing to the database.
- **The cassette re-record is heavy:** one run, at most 2 Playwright workers, and the stand stopped afterwards.

## Done when

- [ ] In `/dev/ai-curator`, every situation is about E2E Test Game. Nothing mentions Hollow Tide.
- [ ] "The whole road" shows all nine checkpoints, from Ideation to the release, with the letters and the verdict of each. Together they cover every direction (toward, sideways, stalled, idle) and all three verdicts.
- [ ] The people changes show in the curator's input on the right days: Cleo joins and leaves, Dan is hired, Bo's hours drop and come back, Ana's hours drop.
- [ ] No unit test fixture names Hollow Tide. All unit tests pass.
- [ ] The e2e personas own E2E Test Game, the cassettes are re-recorded, and the e2e suite passes against them.

## How to check it on the platform

1. `/dev/ai-curator`: pick each situation in turn and look at its input. The project is E2E Test Game, and the dates and people match the table above.
2. "The whole road" → Run: nine checkpoints. The verdicts are `StageClosed`, `StageClosed`, `GoalMissed`, `StageClosed`, `GoalMet`, `StageClosed`, `StageClosed`, `GoalMissed`, `StageClosed`. The last one is the release.
3. `bun run test`: green. `grep -ri "hollow tide" src/services tests/*.ts` finds nothing.
4. `bun run test-env`, then `/dev-signin` → the author persona: their project is E2E Test Game.

## Out of scope

- **Storybook stories and Chat fixtures:** they keep Hollow Tide. They are pictures, not the quality check.
- **Prompts and AI behaviour:** they do not change. If a review on the new road reads badly, that becomes its own task.
- **The production workflow templates and stage texts.**

## Open questions

- **The road above.** Assumed for now, until Dmitry approves it or changes it.
- **Support and Project Completion.** Not on the road: it ends at the release.
- **The lab in Russian.** Decided: the game's content stays English only. With the lab switched to Russian, the team's texts stay English, the way production shows whatever the team wrote.
