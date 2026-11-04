"use client";

import { Flex, Timeline, Typography } from "antd";
import { NotesSummary } from "@/components/checkpoints/CallRoom/CallNotes";
import { AiReviewView } from "@/components/checkpoints/CuratorReview/AiReview";
import { SprintDirectionView } from "@/components/checkpoints/SprintDirection";
import { StatusDot } from "@/components/ui";
import { AI_APPROVE_HOURS } from "@/config/checkpoint";
import type {
	CheckpointVerdict,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { characterFace } from "@/lib/checkpoints/curator-characters";
import { curatorNow } from "@/lib/checkpoints/curator-now";
import { MS_PER_HOUR } from "@/lib/checkpoints/days";
import type { Standing } from "@/lib/checkpoints/verdict";
import type {
	LabRunSprint,
	LabSettled,
} from "@/services/checkpoints/ai-curator-lab";
import type {
	CallNotes,
	CheckpointReviewDto,
	CuratorReview,
} from "@/types/checkpoints";
import { useStandingStatus } from "../checkpoints/EvidenceStanding";
import styles from "./style.module.scss";

const { Text } = Typography;

/** The checkpoint every lab page is drawn in: E2E Test Game's third, 2–29 November, review days a week apart. */
const DAYS = ["02", "09", "16", "23", "30"].map(
	(day) => `2026-11-${day}T00:00:00.000Z`,
);

type Task = CheckpointReviewDto["plan"]["tasks"][number];
type Workflow = { currentStage: string; nextStage: string | null };

const task = (
	id: string,
	text: string,
	done: { type: string; name: string | null }[] = [],
	cut = false,
): Task => ({
	id,
	text,
	cut,
	addedAt: null,
	artifacts: done.map((piece, index) => ({
		id: `a-${id}-${index}`,
		name: piece.name,
		type: piece.type as ProjectArtifactType,
		link: "#",
		checkStatus: "Readable",
	})),
});

/** One Curator's Review, built from a lab run as the page would have it on that day. */
const review = ({
	current,
	goal,
	workflow,
	tasks,
	content,
	edit = null,
	verdict = null,
	character = null,
	checked = false,
	approved = false,
}: {
	checked?: boolean;
	approved?: boolean;
	character?: CheckpointReviewDto["character"];
	current: number;
	goal: string;
	workflow: Workflow;
	tasks: Task[];
	content: CuratorReview;
	edit?: CheckpointReviewDto["plan"]["edit"];
	verdict?: CheckpointReviewDto["verdict"];
}): CheckpointReviewDto => {
	const sessions = DAYS.map((scheduledAt, offset) => ({
		index: offset + 1,
		scheduledAt,
		contentStatus: offset + 1 === current ? ("Ready" as const) : null,
		content: offset + 1 === current ? content : null,
	}));
	return {
		previous: null,
		current,
		// What the page says at noon of the day this answer belongs to.
		curatorNow: curatorNow(
			{
				startedAt: DAYS[0],
				goalAgreedAt: approved ? DAYS[0] : null,
				planCheckedAt: checked ? DAYS[0] : null,
				scopeConfirmedAt: null,
				sessions: sessions.map((row) => ({ ...row, endedAt: row.scheduledAt })),
			},
			new Date(new Date(DAYS[current - 1]).getTime() + 12 * MS_PER_HOUR),
		),
		number: 2,
		stageName: workflow.currentStage,
		startedAt: DAYS[0],
		dueAt: "2026-11-29T00:00:00.000Z",
		project: { id: "lab", name: "E2E Test Game", slug: "e2e-test-game" },
		plan: {
			goal,
			edit,
			editUntil: edit
				? new Date(Date.now() + AI_APPROVE_HOURS * MS_PER_HOUR).toISOString()
				: null,
			checked,
			approved,
			tasks,
		},
		sessions,
		verdict,
		character,
		nextStage:
			verdict?.verdict === "StageClosed" && workflow.nextStage
				? { name: workflow.nextStage, key: "" }
				: null,
	};
};

type Input = Record<string, unknown>;
type Item = {
	id: string;
	kind: string;
	text: string;
	cut?: boolean;
	evidence?: { artifact: { type: string; name: string | null } }[];
};
type PlanTask = {
	id: string;
	text: string;
	cut: boolean;
	evidence: { type: string; name: string | null }[];
};

/** What the author would see on Curator's Review, or null where the call shows nowhere there. */
const reviewOf = (
	call: string,
	input: Input,
	answer: Record<string, unknown>,
	settled: LabSettled | undefined,
	face: CheckpointReviewDto["character"],
): { review: CheckpointReviewDto; index: number } | null => {
	const workflow = input.workflow as unknown as Workflow;
	// The character the run played, as the page would show it.
	const character =
		face ?? characterFace(input.character as string | null | undefined);
	const goal = (input.goal ?? (input.card as { goal: string })?.goal) as string;
	const planTasks = () =>
		(input.tasks as unknown as PlanTask[]).map((row) =>
			task(row.id, row.text, row.evidence, row.cut),
		);

	if (call === "goalCheck") {
		return {
			index: 1,
			review: review({
				character,
				current: 1,
				goal,
				workflow,
				tasks: [],
				content: {
					message: answer.note as string,
					notes: null,
					advice: null,
					goal: answer.goal as CuratorReview["goal"],
					suggestions: answer.suggestions as CuratorReview["suggestions"],
				},
				edit: "goalAndTasks",
			}),
		};
	}
	if (call === "planLetter") {
		const letter = answer.message as string;
		return {
			index: 1,
			review: review({
				character,
				current: 1,
				goal,
				workflow: { currentStage: "Concepting", nextStage: null },
				tasks: (input.tasks as string[]).map((text, at) =>
					task(`t${at}`, text),
				),
				// The check's letter stands behind it; the page reads the plan's.
				content: {
					message: letter,
					notes: null,
					advice: null,
					planLetter: letter,
				},
				checked: true,
				approved: true,
			}),
		};
	}
	if (call === "tasksCheck" || call === "planAdvice") {
		const current = input.moment === "start" ? 1 : 3;
		return {
			index: current,
			review: review({
				character,
				current,
				goal,
				workflow,
				tasks: planTasks(),
				content: {
					message: answer.message as string,
					notes: null,
					advice: {
						tasks: answer.tasks as never,
						add: answer.add as string[],
						hash: "lab",
					},
					goal: answer.goal as CuratorReview["goal"],
				},
				edit: current === 1 ? "goalAndTasks" : "tasks",
				checked: current === 1,
			}),
		};
	}
	if (call === "sprintReview") {
		const current = (input.sprint as number) + 1;
		const verdict = input.verdict as {
			verdict: CheckpointVerdict;
			note: string;
		} | null;
		return {
			index: current,
			review: review({
				character,
				current,
				goal,
				workflow,
				tasks: planTasks(),
				content: {
					message: answer.message as string,
					notes: answer.notes as CuratorReview["notes"],
					advice: answer.advice as CuratorReview["advice"],
				},
				verdict,
			}),
		};
	}
	if (call === "report" && settled?.kind === "report") {
		const items = (input.items as unknown as Item[]).filter(
			(row) => row.kind === "Outcome",
		);
		return {
			index: 5,
			review: review({
				character,
				current: 5,
				goal,
				workflow,
				tasks: items.map((row) =>
					task(
						row.id,
						row.text,
						row.evidence?.map((piece) => piece.artifact),
						row.cut,
					),
				),
				content: {
					message: answer.summary as string,
					notes: null,
					advice: null,
				},
				verdict: { verdict: settled.written, note: settled.note },
			}),
		};
	}
	return null;
};

const noop = () => {};
const saved = async () => {};

/**
 * Frame 12.18.1, "Author's view": the answer drawn by the page the author
 * reads it on. Evidence shows as the label a task carries; suggested lines as
 * the plan editor offers them.
 */
export function AuthorView({
	call,
	input,
	answer,
	settled,
	character = null,
}: {
	call: string;
	input: unknown;
	answer: unknown;
	settled: LabSettled | undefined;
	/** Who the AI curator played on this run. */
	character?: CheckpointReviewDto["character"];
}) {
	const statusOf = useStandingStatus();
	if (!answer || typeof answer !== "object") return null;
	const fields = answer as Record<string, unknown>;

	if (call === "road") {
		const letters =
			(fields.letters as {
				day: number;
				label: string;
				text: string;
			}[]) ?? [];
		return (
			<Timeline
				items={letters.map((letter) => ({
					children: (
						<Flex vertical gap={4}>
							<Text type="secondary">
								Day {letter.day} · {letter.label}
							</Text>
							<Text>{letter.text}</Text>
						</Flex>
					),
				}))}
			/>
		);
	}

	if (call === "run") {
		const sprints = (fields.sprints as LabRunSprint[]) ?? [];
		const stage = (fields.stage as string | undefined) ?? "";
		const verdict = fields.verdict as {
			verdict: CheckpointVerdict;
			verdictNote: string;
		} | null;
		return (
			<Timeline
				items={[
					...sprints.map((row) => ({
						children: (
							<Flex vertical gap={8}>
								<Text strong>Sprint {row.sprint}</Text>
								<Text type="secondary" className={styles.pre}>
									{row.difference}
								</Text>
								{row.direction && (
									<SprintDirectionView
										direction={row.direction}
										stage={stage}
									/>
								)}
								{row.inShort && <Text>{row.inShort}</Text>}
								{row.letter && <Text type="secondary">{row.letter}</Text>}
							</Flex>
						),
					})),
					{
						children: verdict && (
							<Flex vertical gap={8}>
								<Text strong>
									Verdict:{" "}
									{settled?.kind === "report"
										? settled.written
										: verdict.verdict}
									{settled?.kind === "report" && settled.overrode
										? ` (proposed ${settled.overrode})`
										: ""}
								</Text>
								<Text>{verdict.verdictNote}</Text>
							</Flex>
						),
					},
				]}
			/>
		);
	}

	if (call === "shareLine") {
		return <Text className={styles.shareLine}>{fields.line as string}</Text>;
	}

	if (call === "callNotes") {
		const notes = fields as unknown as CallNotes;
		return (
			<NotesSummary
				index={2}
				content={notes}
				plan={{ tasks: [] }}
				curator
				direction={
					notes.direction && (
						<SprintDirectionView
							direction={notes.direction}
							stage="Prototyping"
						/>
					)
				}
			/>
		);
	}

	const page = reviewOf(call, input as Input, fields, settled, character);
	if (page) {
		return (
			<AiReviewView
				review={page.review}
				index={page.index}
				backHref="#"
				onChange={saved}
				onAdvise={noop}
				advising={false}
				onApprove={noop}
				approving={false}
			/>
		);
	}

	if (settled?.kind === "evidence") {
		const standing: Standing = settled.standing;
		const status = statusOf(standing) ?? {
			tone: standing.is === "delivered" ? "success" : "danger",
			label: standing.is === "delivered" ? "Delivered" : "Nothing attached",
		};
		return (
			<Flex vertical gap={8}>
				<Text type="secondary">The label the task carries</Text>
				<StatusDot {...status} />
				<Text type="secondary">The note, read by the report</Text>
				<Text>{fields.note as string}</Text>
			</Flex>
		);
	}

	return null;
}
