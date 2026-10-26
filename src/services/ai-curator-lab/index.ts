import type { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import {
	CheckpointItemKind,
	type CheckpointVerdict,
} from "@/config/prisma-enums";
import { aiCostMicros } from "@/lib/checkpoint-costs";
import {
	type Standing,
	settleVerdict,
	standingOf,
} from "@/lib/checkpoint-verdict";
import { reportEvidence } from "@/repositories/checkpoint-curator.repository";
import {
	describeRead,
	judgeRead,
	mediaLine,
	readArtifact,
	SPRINT_VIDEO_SECONDS,
} from "@/repositories/evidence-seen";
import { type AiTrace, traced } from "@/services/ai-trace";
import { checkpointCurator } from "@/services/checkpoint-curator";
import { writePlanAdvice, writeSprintReview } from "@/services/curator-review";
import { type EvidenceContent, readEvidence } from "@/services/evidence/read";
import {
	evidenceInput,
	goalCheckInput,
	type LabLanguage,
	planAdviceInput,
	reportInput,
	type Situation,
	sprintReviewInput,
	suggestLinesInput,
} from "./schemas";
import { evidenceSituations } from "./situations/evidence";
import { goalCheckSituations } from "./situations/goal-check";
import { planAdviceSituations } from "./situations/plan-advice";
import { reportSituations } from "./situations/report";
import { sprintReviewSituations } from "./situations/sprint-review";
import { suggestLinesSituations } from "./situations/suggest-lines";

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
}) => ({
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

const CALLS = [
	call({
		id: "goalCheck",
		purpose: {
			en: "Before the checkpoint starts: does the promised list fit 28 days and the team's hours? Names what is too big, what nothing builds towards, what could not be proven — and the one change to make on the card.",
			ru: "До старта чекпоинта: влезает ли обещанное в 28 дней и в часы команды? Называет, что слишком большое, к чему ничего не ведёт, что нельзя будет доказать, — и одно изменение в карточке.",
		},
		label: { en: "Goal check", ru: "Проверка цели" },
		when: { en: "Day 1", ru: "День 1" },
		model: checkpointCurator.model,
		schema: goalCheckInput,
		situations: goalCheckSituations,
		run: async (input, locale) => ({
			answer: await checkpointCurator.checkGoal(input, { locale }),
		}),
	}),
	call({
		id: "suggestLines",
		purpose: {
			en: "For an author staring at an empty list: a few lines for one side of the card, each ending in something anyone can open. Nothing is saved; the author edits or drops them.",
			ru: "Для автора перед пустым списком: несколько строк для одной стороны карточки, каждая заканчивается тем, что можно открыть. Ничего не сохраняется — автор правит или выбрасывает.",
		},
		label: { en: "Suggested lines", ru: "Предложенные строки" },
		when: { en: "While the card is a draft", ru: "Пока карточка — черновик" },
		model: checkpointCurator.model,
		schema: suggestLinesInput,
		situations: suggestLinesSituations,
		run: async (input, locale) => ({
			answer: await checkpointCurator.suggestLines(input, { locale }),
		}),
	}),
	call({
		id: "planAdvice",
		purpose: {
			en: "On day 1 and after the sprint 2 review: per task, keep, shorten, reword or cut, so the plan fits the time left — and a short letter on what to do now.",
			ru: "В день 1 и после разбора спринта 2: по каждой задаче — оставить, сократить, переформулировать или убрать, чтобы план влез в оставшееся время, — и короткое письмо, что делать сейчас.",
		},
		label: { en: "Plan advice", ru: "Советы по плану" },
		when: { en: "Day 1 and day 15", ru: "День 1 и день 15" },
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
			en: "After each sprint, instead of a curator's call: what the devlogs, artifacts and pulse showed, what is at risk, and the focus for the next sprint.",
			ru: "После каждого спринта, вместо созвона с куратором: что показали девлоги, артефакты и пульс, что под риском, и фокус на следующий спринт.",
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
			return {
				answer: await writeSprintReview(
					{ ...input, devlogMedia },
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
						evidenceMatch: judged.match,
						artifact: { checkStatus: "Readable" },
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

/** The calls and their situations, for the page to list. */
export const labCatalogue = () => ({
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
) => {
	const found = CALLS.find((each) => each.id === id);
	if (!found) return { error: `No call "${id}"` };

	const started = Date.now();
	const { result, traces } = await traced(async () =>
		found.run(input, language),
	);
	if ("error" in result) return result;

	const sum = (count: (trace: AiTrace) => number) =>
		traces.reduce((total, trace) => total + count(trace), 0);
	return {
		...result,
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
