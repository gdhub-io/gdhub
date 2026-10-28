"use client";

import { Flex, Timeline, Typography } from "antd";
import { AiReviewView } from "@/components/checkpoints/CuratorReview/AiReview";
import { StatusDot } from "@/components/ui";
import { AI_APPROVE_HOURS } from "@/config/checkpoint";
import type {
	CheckpointVerdict,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { MS_PER_HOUR } from "@/lib/checkpoint-days";
import type { Standing } from "@/lib/checkpoint-verdict";
import { curatorNow } from "@/lib/curator-now";
import type { CheckpointReviewDto } from "@/repositories/checkpoint-review";
import type { LabSettled } from "@/services/ai-curator-lab";
import { characterFace } from "@/services/checkpoint-curator/prompts/card";
import type { CuratorReview } from "@/types/checkpoints";
import { useStandingStatus } from "../checkpoints/EvidenceStanding";

const { Text } = Typography;

/** The checkpoint every lab page is drawn in: 1–28 October, review days a week apart. */
const DAYS = ["01", "08", "15", "22", "29"].map(
	(day) => `2026-10-${day}T00:00:00.000Z`,
);

type Task = CheckpointReviewDto["plan"]["tasks"][number];
type Workflow = { currentStage: string; nextStage: string | null };

const task = (
	id: string,
	text: string,
	done?: { type: string; name: string | null } | null,
	cut = false,
): Task => ({
	id,
	text,
	cut,
	addedAt: null,
	artifact: done
		? {
				id: `a-${id}`,
				name: done.name,
				type: done.type as ProjectArtifactType,
				link: "#",
				checkStatus: "Readable",
			}
		: null,
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
		dueAt: "2026-10-28T00:00:00.000Z",
		project: { id: "lab", name: "Hollow Tide", slug: "hollow-tide" },
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
	artifact: { type: string; name: string | null } | null;
};
type PlanTask = {
	id: string;
	text: string;
	cut: boolean;
	done: { type: string; name: string | null } | null;
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
			task(row.id, row.text, row.done, row.cut),
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
					advice: null,
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
					task(row.id, row.text, row.artifact, row.cut),
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
