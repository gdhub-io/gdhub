import type { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import {
	SPRINT_VIDEO_SECONDS,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import {
	CheckpointItemKind,
	type CheckpointVerdict,
} from "@/config/prisma-enums";
import { aiCostMicros } from "@/lib/checkpoints/costs";
import { characterFace } from "@/lib/checkpoints/curator-characters";
import { changeBetween } from "@/lib/checkpoints/picture";
import {
	type Standing,
	settleVerdict,
	standingOf,
} from "@/lib/checkpoints/verdict";
import { reportEvidence } from "@/repositories/checkpoints/ai-curator";
import { mediaLine } from "@/repositories/checkpoints/evidence-seen";
import { type AiTrace, traced } from "@/services/ai-trace";
import { checkpointCurator } from "@/services/checkpoints/ai-curator";
import { createCharacter } from "@/services/checkpoints/ai-curator/character";
import { composePlanLetter } from "@/services/checkpoints/ai-curator/plan-letter";
import {
	midwayAdviceInput,
	reviewSprint,
	writePlanAdvice,
} from "@/services/checkpoints/ai-review";
import { writeCallNotes } from "@/services/checkpoints/call-notes";
import {
	describeRead,
	judgeRead,
	readArtifact,
} from "@/services/checkpoints/flows/evidence-seen";
import { type EvidenceContent, readEvidence } from "@/services/evidence/read";
import type { JournalEntry } from "@/types/checkpoint-curator";
import type { SprintDirection } from "@/types/checkpoints";
import { LAB_PERSONAS } from "./personas";
import {
	callNotesLabInput,
	evidenceInput,
	goalCheckInput,
	type LabLanguage,
	planAdviceInput,
	planLetterInput,
	reportInput,
	roadInput,
	type Situation,
	say,
	sprintReviewInput,
} from "./schemas";
import {
	E2E_CALL_TRANSCRIPT,
	E2E_DEVLOGS,
	E2E_GOAL,
	E2E_ITEMS,
	E2E_SPRINTS,
	E2E_WORKFLOW,
	e2ePicture,
	e2eTasks,
	e2eTeam,
} from "./situations/e2e-test-game";
import { evidenceSituations } from "./situations/evidence";
import { goalCheckSituations } from "./situations/goal-check";
import { hollowTide } from "./situations/hollow-tide";
import {
	planAdviceSituations,
	tasksCheckSituations,
} from "./situations/plan-advice";
import { reportSituations } from "./situations/report";
import { sprintReviewSituations } from "./situations/sprint-review";

/**
 * The AI curator lab (GDHUB-117): each of the curator's calls run on a prepared
 * situation, through the production code, with nothing written anywhere.
 */

/** What the platform made of an answer, for the page's Settled tab. */
export type LabSettled =
	| {
			kind: "report";
			proposed: CheckpointVerdict;
			written: CheckpointVerdict;
			overrode: CheckpointVerdict | null;
			note: string;
			tasks: { id: string; text: string; standing: Standing }[];
	  }
	| {
			kind: "evidence";
			standing: Standing;
			read: { text: string | null; images: number; unread: string | null };
	  }
	| { kind: "media"; devlogMedia: string[] };

/** What the call answered, and what the platform made of the answer. */
type Ran = { answer: unknown; settled?: LabSettled };

type LabCall = {
	id: string;
	label: Record<LabLanguage, string>;
	when: Record<LabLanguage, string>;
	purpose: Record<LabLanguage, string>;
	model: string;
	situations: (
		language: LabLanguage,
	) => { id: string; label: string; input: unknown }[];
	run: (
		input: unknown,
		locale: LabLanguage,
	) => Promise<Ran> | { error: string };
};

/** One call; its input is checked against the call's own shape before it runs. */
const call = <S extends z.ZodType>({
	schema,
	run,
	...shown
}: {
	id: string;
	/** Names on the page, in the chosen language. */
	label: Record<LabLanguage, string>;
	when: Record<LabLanguage, string>;
	/** What the call is for, to judge its answer against. */
	purpose: Record<LabLanguage, string>;
	model: string;
	schema: S;
	situations: (language: LabLanguage) => Situation<S>[];
	run: (input: z.output<S>, locale: LabLanguage) => Promise<Ran>;
}): LabCall => ({
	...shown,
	run: (
		input: unknown,
		locale: LabLanguage,
	): Promise<Ran> | { error: string } => {
		const parsed = schema.safeParse(input);
		return parsed.success
			? run(parsed.data, locale)
			: {
					error: parsed.error.issues
						.map(
							(issue) => `${issue.path.join(".") || "input"}: ${issue.message}`,
						)
						.join("\n"),
				};
	},
});

const CALLS: LabCall[] = [
	call({
		id: "goalCheck",
		purpose: {
			en: "Right after payment, the first letter: does the goal fit 28 days and the team's hours — fits, widen or narrow it — and three to five tasks to start from, each with why. The author then writes one to five tasks of their own.",
			ru: "Сразу после оплаты, первое письмо: влезает ли цель в 28 дней и часы команды — подходит, расширить или сузить, — и 3–5 задач, с которых можно начать, у каждой «зачем». Дальше автор пишет 1–5 своих задач.",
		},
		label: {
			en: "Goal check and suggested tasks",
			ru: "Проверка цели и предложения задач",
		},
		when: { en: "After payment", ru: "После оплаты" },
		model: checkpointCurator.model,
		schema: goalCheckInput,
		situations: goalCheckSituations,
		run: async (input, locale) => ({
			answer: await checkpointCurator.checkGoal(input, { locale }),
		}),
	}),
	call({
		id: "tasksCheck",
		purpose: {
			en: "Day 1, once the author sends their tasks: the one check — a word on the goal as it stands now, and per task keep, shorten, reword or cut, and why. Then the author edits and approves the plan.",
			ru: "День 1, когда автор отправил свои задачи: единственная проверка — слово о цели в её нынешнем виде и по каждой задаче оставить, сократить, переформулировать или убрать, и почему. Потом автор правит и утверждает план.",
		},
		label: {
			en: "Tasks check and advice",
			ru: "Проверка задач и советы по правкам",
		},
		when: { en: "Day 1, after sending", ru: "День 1, после отправки" },
		model: AI_MODELS.curatorReview,
		schema: planAdviceInput,
		situations: tasksCheckSituations,
		run: async (input, locale) => ({
			answer: await writePlanAdvice(input, undefined, locale),
		}),
	}),
	call({
		id: "planLetter",
		purpose: {
			en: "Day 1, once the plan is approved: the letter the team reads for the whole first sprint — start on the plan, tell how it goes in devlog posts, attach what proves a task done, and when the curator looks again. No advice: that was the check.",
			ru: "День 1, когда план утверждён: письмо, которое команда видит весь первый спринт, — начинайте, рассказывайте в девлогах, прикладывайте доказательства к задачам, и когда куратор посмотрит снова. Без советов: они были в проверке.",
		},
		label: { en: "The plan approved", ru: "План утверждён" },
		when: { en: "Day 1, after approval", ru: "День 1, после утверждения" },
		model: AI_MODELS.curatorAssist,
		schema: planLetterInput,
		situations: (language) => {
			const project = hollowTide(language);
			const { demo, board, playtest } = project.outcomes;
			return [
				{
					id: "approved",
					label: say(
						language,
						"Hollow Tide: the plan approved",
						"Hollow Tide: план утверждён",
					),
					input: {
						goal: project.goal,
						tasks: [demo, board, playtest].map((task) => task.text),
						reviewOn: say(language, "Thursday 8 October", "четверг, 8 октября"),
					},
				},
			];
		},
		run: async ({ journal, ...input }) => ({
			answer: {
				message: await composePlanLetter({ ...input, journal: journal ?? [] }),
			},
		}),
	}),
	call({
		id: "planAdvice",
		purpose: {
			en: "After the sprint 2 review, the last change to the tasks: per task keep, shorten, reword or cut, so the plan fits the two weeks left — and a short letter on what to do now.",
			ru: "После разбора спринта 2, последняя правка задач: по каждой — оставить, сократить, переформулировать или убрать, чтобы план влез в оставшиеся две недели, — и короткое письмо, что делать сейчас.",
		},
		label: { en: "Plan advice", ru: "Советы по плану" },
		when: { en: "Day 15", ru: "День 15" },
		model: AI_MODELS.curatorReview,
		schema: planAdviceInput,
		situations: planAdviceSituations,
		run: async (input, locale) => ({
			answer: await writePlanAdvice(input, undefined, locale),
		}),
	}),
	call({
		id: "sprintReview",
		purpose: {
			en: "After each sprint, instead of a curator's call: the review of what the devlogs, artifacts and pulse showed; on day 15 the advice on the tasks that reads it; then the letter and the next sprint's focus from both. The letter says whether the team is on course, at risk or behind, and never contradicts the advice.",
			ru: "После каждого спринта, вместо созвона с куратором: разбор того, что показали девлоги, артефакты и пульс; на 15-й день — советы по задачам на основе разбора; затем письмо и фокус на следующий спринт из того и другого. Письмо говорит, идёт ли команда по курсу, под риском или отстаёт, и не спорит с советами.",
		},
		label: { en: "Sprint review", ru: "Разбор спринта" },
		when: {
			en: "Days 8, 15, 22, 29 · devlogs with their media",
			ru: "Дни 8, 15, 22, 29 · девлоги с медиа",
		},
		model: AI_MODELS.curatorReview,
		schema: sprintReviewInput,
		situations: sprintReviewSituations,
		run: async ({ media, ...input }, locale) => {
			// Read in turn, as they share the video budget; described at once.
			let left = SPRINT_VIDEO_SECONDS;
			const reads: EvidenceContent[] = [];
			for (const link of media) {
				const content = await readEvidence(link, { videoSecondsLeft: left });
				left -= content.videoSeconds;
				reads.push(content);
			}
			const devlogMedia = await Promise.all(
				reads.map(async (content, index) =>
					mediaLine(
						media[index],
						await describeRead(content, undefined, locale),
						content.unread,
					),
				),
			);
			const advise =
				input.sprint === 2 && !input.final
					? (review: string) =>
							writePlanAdvice(
								midwayAdviceInput(input, review),
								undefined,
								locale,
							)
					: null;
			return {
				answer: await reviewSprint(
					{ ...input, devlogMedia },
					advise,
					undefined,
					locale,
				),
				settled: { kind: "media", devlogMedia },
			};
		},
	}),
	call({
		id: "evidence",
		purpose: {
			en: "For each task's artifact: does it show what the task promised? The answer feeds the verdict — delivered, partly, on trust or not delivered. The author sees it as a label; the note is for the report.",
			ru: "Для артефакта каждой задачи: показывает ли он обещанное? Ответ идёт в вердикт — сдано, частично, на доверии или не сдано. Автор видит метку; заметка — для отчёта.",
		},
		label: { en: "Evidence check", ru: "Проверка доказательства" },
		when: { en: "Each sprint", ru: "Каждый спринт" },
		model: AI_MODELS.curatorReview,
		schema: evidenceInput,
		situations: evidenceSituations,
		run: async ({ evidence, ...task }, locale) => {
			const content: EvidenceContent =
				"link" in evidence
					? await readArtifact(
							{ link: evidence.link, type: task.artifactType },
							SPRINT_VIDEO_SECONDS,
						)
					: { ...evidence, images: [], videoSeconds: 0 };
			const judged = await judgeRead(task, content, undefined, locale);
			return {
				answer: judged,
				settled: judged && {
					kind: "evidence",
					read: {
						text: content.text,
						images: content.images.length,
						unread: content.unread,
					},
					// The task as a readable artifact with this answer, as the verdict counts it.
					standing: standingOf({
						id: "lab",
						kind: CheckpointItemKind.Outcome,
						text: task.task,
						cut: false,
						evidence: [
							{ match: judged.match, artifact: { checkStatus: "Readable" } },
						],
					}),
				},
			};
		},
	}),
	call({
		id: "report",
		purpose: {
			en: "Day 29: what was delivered against the goal, and a proposed verdict that the rule then settles. The note tells the author why, what was taken on trust, and what to do next.",
			ru: "День 29: что сдано против цели и предложенный вердикт, который затем решает правило. Заметка объясняет автору почему, что принято на доверии и что делать дальше.",
		},
		label: { en: "Final report and verdict", ru: "Итоговый отчёт и вердикт" },
		when: { en: "Day 29", ru: "День 29" },
		model: checkpointCurator.model,
		schema: reportInput,
		situations: reportSituations,
		run: async ({ goal, items: rows, ...rest }, locale) => {
			const items = rows.map((row) => ({
				...row,
				addedAt: row.addedAt ? new Date(row.addedAt) : null,
			}));
			const proposed = await checkpointCurator.writeReport(
				{ ...reportEvidence(goal, items), ...rest, calls: [] },
				{ locale },
			);
			if (!proposed) return { answer: null };
			const settled = settleVerdict(items, proposed.verdict);
			return {
				answer: proposed,
				settled: {
					kind: "report",
					proposed: proposed.verdict,
					written: settled.verdict,
					overrode: settled.overrode,
					note: proposed.verdictNote,
					tasks: items
						.filter(
							(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
						)
						.map((item) => ({
							id: item.id,
							text: item.text,
							standing: standingOf(item),
						})),
				},
			};
		},
	}),
];

type Letter = { day: number; label: string; text: string };

/** One sprint of the whole-run call, as the lab page draws it. */
export type LabRunSprint = {
	sprint: number;
	difference: string;
	idle: boolean;
	direction: SprintDirection | undefined;
	inShort: string | undefined;
	letter: string | undefined;
};

/** The whole road on Hollow Tide, in order: which call, on which situation, and the letter it leaves. */
const ROAD: {
	call: string;
	situation: string;
	day: number;
	label: Record<LabLanguage, string>;
	letter: (answer: Record<string, unknown>) => string | null;
}[] = [
	{
		call: "goalCheck",
		situation: "fits",
		day: 1,
		label: { en: "The first letter", ru: "Первое письмо" },
		letter: (answer) => answer.note as string,
	},
	{
		call: "tasksCheck",
		situation: "fits",
		day: 1,
		label: { en: "The tasks checked", ru: "Задачи проверены" },
		letter: (answer) => answer.message as string,
	},
	{
		call: "planLetter",
		situation: "approved",
		day: 1,
		label: { en: "The plan approved", ru: "План утверждён" },
		letter: (answer) => answer.message as string,
	},
	{
		call: "sprintReview",
		situation: "good-week",
		day: 8,
		label: { en: "Sprint 1 review", ru: "Разбор спринта 1" },
		letter: (answer) => answer.message as string,
	},
	{
		call: "sprintReview",
		situation: "quiet",
		day: 15,
		label: { en: "Sprint 2 review", ru: "Разбор спринта 2" },
		letter: (answer) => answer.message as string,
	},
	{
		call: "sprintReview",
		situation: "on-course",
		day: 22,
		label: { en: "Sprint 3 review", ru: "Разбор спринта 3" },
		letter: (answer) => answer.message as string,
	},
	{
		call: "sprintReview",
		situation: "final",
		day: 29,
		label: { en: "The final review", ru: "Итоговый разбор" },
		letter: (answer) => answer.message as string,
	},
	{
		call: "report",
		situation: "all-delivered",
		day: 29,
		label: { en: "The verdict", ru: "Вердикт" },
		letter: (answer) => answer.verdictNote as string,
	},
];

/**
 * Every letter of one checkpoint in order, each reading the ones before it as
 * production passes them: to judge the road as one story, told by one character.
 */
CALLS.push(
	call({
		id: "road",
		purpose: {
			en: "The whole checkpoint as the author lives it: every letter from day 1 to the verdict, in order, one character, each continuing the ones before it. Read it as one story — the road from where the team started to the goal.",
			ru: "Весь чекпоинт, как его проживает автор: все письма от дня 1 до вердикта по порядку, один персонаж, каждое продолжает предыдущие. Читать как одну историю — путь команды от старта к цели.",
		},
		label: { en: "The whole road", ru: "Весь путь" },
		when: { en: "Days 1–29", ru: "Дни 1–29" },
		model: AI_MODELS.curatorReview,
		schema: roadInput,
		situations: (language) => [
			{
				id: "hollow-tide",
				label: say(
					language,
					"Hollow Tide: a quiet sprint 2, everything delivered",
					"Hollow Tide: тихий спринт 2, всё сдано",
				),
				input: {},
			},
		],
		run: async ({ character }, locale) => {
			const letters: Letter[] = [];
			const journal: JournalEntry[] = [];
			for (const step of ROAD) {
				const found = CALLS.find((each) => each.id === step.call);
				const situation = found
					?.situations(locale)
					.find((each) => each.id === step.situation);
				if (!found || !situation) continue;
				const ran = await found.run(
					{ ...(situation.input as object), character, journal: [...journal] },
					locale,
				);
				if ("error" in ran || !ran.answer) continue;
				const text = step.letter(ran.answer as Record<string, unknown>);
				if (!text) continue;
				letters.push({ day: step.day, label: step.label[locale], text });
				journal.push({ day: step.day, text });
			}
			return { answer: { letters } };
		},
	}),
);

/** The calls and their situations, for the page to list. */
export const labCatalogue = () => ({
	personas: LAB_PERSONAS.map(({ id, label }) => ({ id, label })),
	calls: CALLS.map(({ run, situations, ...shown }) => ({
		...shown,
		situations: { en: situations("en"), ru: situations("ru") },
	})),
});

/** Runs one call on an input; a wrong input is refused before any model call. */
export const runLab = async (
	id: string,
	input: unknown,
	language: LabLanguage,
	personaId?: string,
) => {
	const found = CALLS.find((each) => each.id === id);
	if (!found) return { error: `No call "${id}"` };
	const persona = LAB_PERSONAS.find((each) => each.id === personaId)?.persona;
	const started = Date.now();
	let character: string | null = null;
	const { result, traces } = await traced(async () => {
		// The character the picked profile gives, made as a checkpoint makes it at its start.
		if (persona) character = await createCharacter(persona);
		const shown =
			character && input && typeof input === "object"
				? { ...input, character }
				: input;
		return found.run(shown, language);
	});

	if ("error" in result) return result;

	const sum = (count: (trace: AiTrace) => number) =>
		traces.reduce((total, trace) => total + count(trace), 0);
	return {
		...result,
		// Who spoke, for the page to draw them as the author would see them.
		character: characterFace(character),
		traces,
		inputTokens: sum((trace) => trace.inputTokens),
		outputTokens: sum((trace) => trace.outputTokens),
		costMicros: sum(
			(trace) =>
				aiCostMicros(trace.model, trace.inputTokens, trace.outputTokens) ?? 0,
		),
		ms: Date.now() - started,
	};
};

/**
 * GDHUB-133: the whole run on E2E Test Game through the same code as
 * production — each sprint's picture difference, its review with the two
 * directions (each review reading the last one's), then the verdict reading
 * the run's difference and all four directions.
 */
CALLS.push(
	call({
		id: "run",
		purpose: {
			en: "Pictures 0–4 → reviews 1–4 → the verdict on E2E Test Game, a platformer whose road is known: toward, sideways, nothing done, toward; the playtest has two players, not five. Check each direction against that, that sprint 3 comes out idle, and that the verdict names the road and misses the goal.",
			ru: "Картины 0–4 → разборы 1–4 → вердикт на E2E Test Game, платформере с известным путём: к цели, в сторону, ничего, к цели; в плейтесте двое, а не пятеро. Сверить каждое направление с этим, что спринт 3 — «ничего не делалось», и что вердикт называет путь и цель не достигнута.",
		},
		label: {
			en: "The whole run, with directions",
			ru: "Весь чекпоинт, с направлениями",
		},
		when: { en: "Days 1–29", ru: "Дни 1–29" },
		model: AI_MODELS.curatorReview,
		schema: roadInput,
		situations: (language) => [
			{
				id: "e2e-test-game",
				label: say(
					language,
					"E2E Test Game: toward, sideways, idle, toward",
					"E2E Test Game: к цели, в сторону, ничего, к цели",
				),
				input: {},
			},
		],
		run: async ({ character }, locale) => {
			const sprints: LabRunSprint[] = [];
			const journal: JournalEntry[] = [];
			let lastDirection: SprintDirection | null = null;
			let focus: string[] = [];

			for (let sprint = 1; sprint <= SPRINTS_PER_CHECKPOINT; sprint++) {
				const { difference, idle } = changeBetween(
					e2ePicture(sprint - 1),
					e2ePicture(sprint),
					`the start of sprint ${sprint}`,
				);
				const review: Awaited<ReturnType<typeof reviewSprint>> =
					await reviewSprint(
						{
							goal: E2E_GOAL,
							character,
							journal: [...journal],
							workflow: E2E_WORKFLOW,
							sprint,
							tasks: e2eTasks(sprint),
							devlogs: E2E_SPRINTS[sprint].devlogs,
							devlogMedia: [],
							artifacts: E2E_SPRINTS[sprint].artifacts,
							team: e2eTeam(sprint),
							focusLastReview: focus,
							final: sprint === SPRINTS_PER_CHECKPOINT,
							picture: "",
							marketing: { devlogs: [], links: [] },
							difference,
							idle,
							lastDirection,
						},
						null,
						undefined,
						locale,
					);
				sprints.push({
					sprint,
					difference,
					idle,
					direction: review?.notes.direction,
					inShort: review?.notes.inShort,
					letter: review?.message,
				});
				if (!review) continue;
				journal.push({ day: sprint * 7 + 1, text: review.message });
				lastDirection = review.notes.direction ?? null;
				focus = review.notes.agreed.map((line) => line.text);
			}

			const items = E2E_ITEMS.map((item) => ({ ...item, addedAt: null }));
			const directions = sprints.flatMap(({ sprint, direction }) =>
				direction ? [{ sprint, direction }] : [],
			);
			const proposed = await checkpointCurator.writeReport(
				{
					...reportEvidence(E2E_GOAL, items),
					character,
					journal,
					workflow: E2E_WORKFLOW,
					revision: null,
					devlogs: E2E_DEVLOGS,
					team: e2eTeam(SPRINTS_PER_CHECKPOINT),
					calls: [],
					picture: "",
					marketing: { devlogs: [], links: [] },
					difference: changeBetween(
						e2ePicture(0),
						e2ePicture(SPRINTS_PER_CHECKPOINT),
						"day 1",
					).difference,
					directions,
				},
				{ locale },
			);
			if (!proposed) return { answer: { sprints, verdict: null } };
			const settled = settleVerdict(items, proposed.verdict);
			return {
				answer: { sprints, verdict: proposed },
				settled: {
					kind: "report",
					proposed: proposed.verdict,
					written: settled.verdict,
					overrode: settled.overrode,
					note: proposed.verdictNote,
					tasks: items
						.filter((item) => item.kind === CheckpointItemKind.Outcome)
						.map((item) => ({
							id: item.id,
							text: item.text,
							standing: standingOf(item),
						})),
				},
			};
		},
	}),
	call({
		id: "callNotes",
		purpose: {
			en: "A human curator's call read into the same shape as an AI review: three lenses and the direction. A lens the call never touched must come back empty — never filled in.",
			ru: "Звонок человека-куратора в той же форме, что разбор ИИ: три линзы и направление. Линза, о которой на звонке не говорили, должна вернуться пустой — никогда не дописанной.",
		},
		label: { en: "Call notes", ru: "Заметки звонка" },
		when: { en: "After calls 2–5", ru: "После звонков 2–5" },
		model: AI_MODELS.callNotes,
		schema: callNotesLabInput,
		situations: (language) => [
			{
				id: "no-marketing",
				label: say(
					language,
					"E2E Test Game, call 2: nobody speaks of the audience",
					"E2E Test Game, звонок 2: об аудитории ни слова",
				),
				input: { callIndex: 2, transcript: E2E_CALL_TRANSCRIPT },
			},
		],
		run: async ({ callIndex, transcript }) => ({
			answer: await writeCallNotes({
				callIndex,
				goal: E2E_GOAL,
				tasks: e2eTasks(callIndex - 1),
				transcript,
				devlog: E2E_SPRINTS[callIndex - 1]?.devlogs.join("\n\n") || null,
				artifacts: E2E_SPRINTS[callIndex - 1]?.artifacts ?? [],
				agreedLastCall: [],
			}),
		}),
	}),
);
