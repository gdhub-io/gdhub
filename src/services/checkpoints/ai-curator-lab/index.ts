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
	type VerdictItem,
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
	runInput,
	type Situation,
	say,
	sprintReviewInput,
} from "./schemas";
import {
	E2E_CALL_TRANSCRIPT,
	E2E_ROAD,
	e2eCheckpoint,
} from "./situations/e2e-test-game";
import { evidenceSituations } from "./situations/evidence";
import { goalCheckSituations } from "./situations/goal-check";
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

/** What the platform made of a report: the verdict the rule settled, and each open task's standing. */
const settledReport = (
	items: VerdictItem[],
	proposed: { verdict: CheckpointVerdict; verdictNote: string },
): LabSettled => {
	const settled = settleVerdict(items, proposed.verdict);
	return {
		kind: "report",
		proposed: proposed.verdict,
		written: settled.verdict,
		overrode: settled.overrode,
		note: proposed.verdictNote,
		tasks: items
			.filter((item) => item.kind === CheckpointItemKind.Outcome && !item.cut)
			.map((item) => ({
				id: item.id,
				text: item.text,
				standing: standingOf(item),
			})),
	};
};

/** Which road checkpoints a run covers: one, or all of them. */
const checkpointsOf = (checkpoint?: number) =>
	checkpoint ? [checkpoint] : E2E_ROAD.map((each) => each.number);

const roadLabel = (language: LabLanguage, number: number) => {
	const { checkpoint } = e2eCheckpoint(number);
	const roads = checkpoint.sprints.map((sprint) => sprint.direction).join(", ");
	return say(
		language,
		`Checkpoint ${number} · ${checkpoint.stage}: ${roads} → ${checkpoint.verdict}`,
		`Чекпоинт ${number} · ${checkpoint.stage}: ${roads} → ${checkpoint.verdict}`,
	);
};

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
		situations: (language) => [
			{
				id: "approved",
				label: say(
					language,
					"E2E Test Game, checkpoint 3: the plan approved",
					"E2E Test Game, чекпоинт 3: план утверждён",
				),
				input: e2eCheckpoint(3).planLetter(),
			},
		],
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
			return { answer: proposed, settled: settledReport(items, proposed) };
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

const LETTER_LABEL = {
	goal: { en: "The first letter", ru: "Первое письмо" },
	tasks: { en: "The tasks checked", ru: "Задачи проверены" },
	plan: { en: "The plan approved", ru: "План утверждён" },
	review: { en: "Sprint {n} review", ru: "Разбор спринта {n}" },
	final: { en: "The final review", ru: "Итоговый разбор" },
	verdict: { en: "The verdict", ru: "Вердикт" },
};

/** Runs one of the lab's calls from inside another, as the page would. */
const runCall = async (
	id: string,
	input: object,
	locale: LabLanguage,
): Promise<Ran | null> => {
	const found = CALLS.find((each) => each.id === id);
	if (!found) return null;
	const ran = await found.run(input, locale);
	return "error" in ran ? null : ran;
};

/**
 * Every letter of E2E Test Game's checkpoints in order, each reading the ones
 * before it in its checkpoint as production passes them: to judge the road as
 * one story, told by one character.
 */
CALLS.push(
	call({
		id: "road",
		purpose: {
			en: "The road as the author lives it: every letter from day 1 to the verdict, in order, one character, each continuing the ones before it — for one checkpoint of E2E Test Game, or all nine from the idea to the release. Read it as one story, and each verdict against the one the road expects.",
			ru: "Путь, как его проживает автор: все письма от дня 1 до вердикта по порядку, один персонаж, каждое продолжает предыдущие, — для одного чекпоинта E2E Test Game или всех девяти, от идеи до релиза. Читать как одну историю, а каждый вердикт сверять с ожидаемым.",
		},
		label: { en: "The whole road", ru: "Весь путь" },
		when: { en: "Days 1–29, each checkpoint", ru: "Дни 1–29, каждый чекпоинт" },
		model: AI_MODELS.curatorReview,
		schema: roadInput,
		situations: (language) => [
			{
				id: "all",
				label: say(
					language,
					"E2E Test Game: all nine checkpoints, the idea to the release",
					"E2E Test Game: все девять чекпоинтов, от идеи до релиза",
				),
				input: {},
			},
			...E2E_ROAD.map(({ number }) => ({
				id: `checkpoint-${number}`,
				label: roadLabel(language, number),
				input: { checkpoint: number },
			})),
		],
		run: async ({ character, checkpoint }, locale) => {
			const numbers = checkpointsOf(checkpoint);
			const letters: Letter[] = [];
			for (const number of numbers) {
				const prefix = numbers.length > 1 ? `Checkpoint ${number} · ` : "";
				const journal: JournalEntry[] = [];
				const write = (day: number, label: string, text: unknown) => {
					if (typeof text !== "string" || !text) return;
					letters.push({ day, label: `${prefix}${label}`, text });
					journal.push({ day, text });
				};
				const with_ = (input: object) => ({
					...input,
					character,
					journal: [...journal],
				});

				const cp = e2eCheckpoint(number);
				const goal = await runCall("goalCheck", with_(cp.goalCheck()), locale);
				write(
					1,
					LETTER_LABEL.goal[locale],
					(goal?.answer as { note?: string })?.note,
				);
				const tasks = await runCall(
					"tasksCheck",
					with_(cp.tasksCheck()),
					locale,
				);
				write(
					1,
					LETTER_LABEL.tasks[locale],
					(tasks?.answer as { message?: string })?.message,
				);
				const plan = await runCall(
					"planLetter",
					with_(cp.planLetter()),
					locale,
				);
				write(
					1,
					LETTER_LABEL.plan[locale],
					(plan?.answer as { message?: string })?.message,
				);

				let focus: string[] = [];
				let lastDirection: SprintDirection | null = null;
				for (let sprint = 1; sprint <= SPRINTS_PER_CHECKPOINT; sprint++) {
					const ran = await runCall(
						"sprintReview",
						{
							...cp.sprintReview(sprint, { journal, focus, lastDirection }),
							character,
						},
						locale,
					);
					const review = ran?.answer as Awaited<
						ReturnType<typeof reviewSprint>
					>;
					const label =
						sprint === SPRINTS_PER_CHECKPOINT
							? LETTER_LABEL.final[locale]
							: LETTER_LABEL.review[locale].replace("{n}", String(sprint));
					write(sprint * 7 + 1, label, review?.message);
					focus = review?.notes.agreed.map((line) => line.text) ?? [];
					lastDirection = review?.notes.direction ?? null;
				}

				const report = await runCall("report", with_(cp.report()), locale);
				const settled =
					report?.settled?.kind === "report" ? report.settled : null;
				write(
					29,
					`${LETTER_LABEL.verdict[locale]}${settled ? ` · ${settled.written}` : ""}`,
					settled?.note,
				);
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
 * GDHUB-133: one checkpoint of E2E Test Game through the same code as
 * production — each sprint's picture difference, its review with the two
 * directions (each review reading the last one's), then the verdict reading
 * the run's difference and all four directions.
 */
CALLS.push(
	call({
		id: "run",
		purpose: {
			en: "Pictures 0–4 → reviews 1–4 → the verdict on one checkpoint of E2E Test Game, a platformer whose road is known. The situation names each sprint's direction and the verdict the road expects: check each review against it, that an idle sprint comes out idle, and that the verdict names the road.",
			ru: "Картины 0–4 → разборы 1–4 → вердикт на одном чекпоинте E2E Test Game, платформера с известным путём. В названии ситуации — направление каждого спринта и ожидаемый вердикт: сверить с ними каждый разбор, что пустой спринт вышел пустым и что вердикт называет путь.",
		},
		label: {
			en: "The whole run, with directions",
			ru: "Весь чекпоинт, с направлениями",
		},
		when: { en: "Days 1–29", ru: "Дни 1–29" },
		model: AI_MODELS.curatorReview,
		schema: runInput,
		situations: (language) =>
			E2E_ROAD.map(({ number }) => ({
				id: `checkpoint-${number}`,
				label: roadLabel(language, number),
				input: { checkpoint: number },
			})),
		run: async ({ character, checkpoint: number }, locale) => {
			const cp = e2eCheckpoint(number);
			const sprints: LabRunSprint[] = [];
			const journal: JournalEntry[] = [];
			let lastDirection: SprintDirection | null = null;
			let focus: string[] = [];

			for (let sprint = 1; sprint <= SPRINTS_PER_CHECKPOINT; sprint++) {
				const input = cp.sprintReview(sprint, {
					journal,
					focus,
					lastDirection,
				});
				const { difference, idle } = input;
				const review: Awaited<ReturnType<typeof reviewSprint>> =
					await reviewSprint(
						{ ...input, character, devlogMedia: [] },
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

			const items = cp.items();
			const directions = sprints.flatMap(({ sprint, direction }) =>
				direction ? [{ sprint, direction }] : [],
			);
			const { goal, items: _rows, devlogs, ...facts } = cp.report();
			const proposed = await checkpointCurator.writeReport(
				{
					...facts,
					...reportEvidence(goal, items),
					character,
					journal,
					devlogs,
					calls: [],
					difference: changeBetween(
						cp.picture(0),
						cp.picture(SPRINTS_PER_CHECKPOINT),
						"day 1",
					).difference,
					directions,
				},
				{ locale },
			);
			const stage = cp.checkpoint.stage;
			if (!proposed) return { answer: { stage, sprints, verdict: null } };
			return {
				answer: { stage, sprints, verdict: proposed },
				settled: settledReport(items, proposed),
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
		run: async ({ callIndex, transcript }) => {
			const cp = e2eCheckpoint(3);
			const sprint = callIndex - 1;
			return {
				answer: await writeCallNotes({
					callIndex,
					goal: cp.checkpoint.goal,
					tasks: cp.tasks(sprint),
					transcript,
					devlog: cp.sprint(sprint).devlogs.join("\n\n") || null,
					artifacts: cp.sprint(sprint).artifacts,
					agreedLastCall: [],
				}),
			};
		},
	}),
);
