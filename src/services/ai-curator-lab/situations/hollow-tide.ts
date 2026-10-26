import { CURATOR_STAGE_BRIEFS } from "@/config/checkpoint";
import type { LabLanguage } from "../schemas";

/**
 * The one project every situation is about, so they read as one checkpoint at
 * different moments: Hollow Tide, a small team building its first island.
 *
 * In Russian, what the team wrote is Russian and what the platform writes —
 * the stage, the picture's headings, roles — stays as production writes it.
 */

/** The Prototyping stage of the Default workflow, as its template stands (2026-10-26). */
const WORKFLOW = {
	currentStage: "Prototyping",
	description: CURATOR_STAGE_BRIEFS.Prototyping,
	requiredTasks: ["Publish a devlog about the prototype"],
};

/**
 * As `projectPicture` writes it: the stage's path, the team with its pulse, the
 * activity. `devlogDone` ticks the stage's one required task, as day 29 sees it.
 */
const picture = (artifact: string, devlogDone: boolean) => `Stage: Prototyping.
To move on to "Preparing a demo version", only this has to be done on this stage:
- [${devlogDone ? "x" : " "}] Publish a devlog about the prototype
Suggested on this stage, not required — they never hold it:
- [ ] Request expert advice
- [ ] Collect 10 applause from other users

Team (3):
- Marta: Game designer, Middle, 20–25 h/week stated; week 1 worked, week 2 worked, week 3 worked
- Tom: Artist, Junior, 10–15 h/week stated; week 1 worked, week 2 not confirmed, week 3 worked
- Ivo: Programmer, Middle, hours not stated; week 1 worked, week 2 worked, week 3 not confirmed

What happened on the project from 2026-10-01 to 2026-10-28:
- 2026-10-05 · Marta added "${artifact}"
- 2026-10-09 · Ivo joined as Programmer`;

const TEXT = {
	en: {
		goal: "A playable vertical slice of the first island",
		workflow: WORKFLOW,
		pitch: "A tide-driven exploration game on a drowning island.",
		picture: picture("Greybox build", false),
		pictureAtEnd: picture("Greybox build", true),
		devlogs: {
			greybox:
				"Week 1: greybox of the island is in. You can walk from the beach to the lighthouse, the tide rises every two minutes and floods the lower paths. Build is on itch.io.",
			styleBoard:
				"Week 3: the art style board is in Figma — palette, two hero sheets and a fog study. The board is private for now; the link is on the task.",
			playtest:
				"Week 4: playtest on Saturday. Three friends played for 20 minutes each; two got stuck at the flooded bridge. Notes are in the doc.",
		},
		outcomes: {
			demo: { id: "o1", text: "Playable island demo on itch.io" },
			board: { id: "o2", text: "Art style board: palette and two hero sheets" },
			playtest: { id: "o3", text: "Playtest with 5 players, notes written up" },
		},
	},
	ru: {
		goal: "Играбельный вертикальный срез первого острова",
		workflow: WORKFLOW,
		pitch: "Исследование тонущего острова, где всё решает прилив.",
		picture: picture("Серый блокаут", false),
		pictureAtEnd: picture("Серый блокаут", true),
		devlogs: {
			greybox:
				"Неделя 1: серый блокаут острова готов. Можно дойти от пляжа до маяка, прилив поднимается каждые две минуты и затапливает нижние тропы. Сборка на itch.io.",
			styleBoard:
				"Неделя 3: доска стиля в Figma — палитра, два листа главных героев и этюд тумана. Доска пока закрытая, ссылка в задаче.",
			playtest:
				"Неделя 4: плейтест в субботу. Трое друзей играли по 20 минут, двое застряли у затопленного моста. Заметки в документе.",
		},
		outcomes: {
			demo: { id: "o1", text: "Играбельное демо острова на itch.io" },
			board: {
				id: "o2",
				text: "Доска стиля: палитра и два листа главных героев",
			},
			playtest: { id: "o3", text: "Плейтест на 5 игроков, заметки записаны" },
		},
	},
};

export const hollowTide = (language: LabLanguage) => TEXT[language];
