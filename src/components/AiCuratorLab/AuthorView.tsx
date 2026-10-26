"use client";

import { Flex, List, Typography } from "antd";
import { AiReviewView } from "@/components/checkpoints/CuratorReview/AiReview";
import { StatusDot } from "@/components/ui";
import type {
	CheckpointVerdict,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type { Standing } from "@/lib/checkpoint-verdict";
import type { CheckpointReviewDto } from "@/repositories/checkpoint-review";
import type { LabSettled } from "@/services/ai-curator-lab";
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
}: {
	current: number;
	goal: string;
	workflow: Workflow;
	tasks: Task[];
	content: CuratorReview;
	edit?: CheckpointReviewDto["plan"]["edit"];
	verdict?: CheckpointReviewDto["verdict"];
}): CheckpointReviewDto => ({
	previous: null,
	current,
	number: 2,
	stageName: workflow.currentStage,
	startedAt: DAYS[0],
	dueAt: "2026-10-28T00:00:00.000Z",
	project: { id: "lab", name: "Hollow Tide", slug: "hollow-tide" },
	plan: {
		goal,
		edit,
		editUntil: edit
			? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
			: null,
		tasks,
	},
	sessions: DAYS.map((scheduledAt, offset) => ({
		index: offset + 1,
		scheduledAt,
		contentStatus: offset + 1 === current ? "Ready" : null,
		content: offset + 1 === current ? content : null,
	})),
	verdict,
	nextStage:
		verdict?.verdict === "StageClosed" && workflow.nextStage
			? { name: workflow.nextStage, key: "" }
			: null,
});

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
): { review: CheckpointReviewDto; index: number } | null => {
	const workflow = input.workflow as unknown as Workflow;
	const goal = (input.goal ?? (input.card as { goal: string })?.goal) as string;
	const planTasks = () =>
		(input.tasks as unknown as PlanTask[]).map((row) =>
			task(row.id, row.text, row.done, row.cut),
		);

	if (call === "goalCheck") {
		const card = input.card as { outcomes: { id: string; text: string }[] };
		const current = 1;
		return {
			index: current,
			review: review({
				current,
				goal,
				workflow,
				tasks: card.outcomes.map((row) => task(row.id, row.text)),
				content: { message: answer.note as string, notes: null, advice: null },
				edit: "goalAndTasks",
			}),
		};
	}
	if (call === "planAdvice") {
		const current = input.moment === "start" ? 1 : 3;
		return {
			index: current,
			review: review({
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
				},
				edit: current === 1 ? "goalAndTasks" : "tasks",
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
}: {
	call: string;
	input: unknown;
	answer: unknown;
	settled: LabSettled | undefined;
}) {
	const statusOf = useStandingStatus();
	if (!answer || typeof answer !== "object") return null;
	const fields = answer as Record<string, unknown>;

	const page = reviewOf(call, input as Input, fields, settled);
	if (page) {
		return (
			<AiReviewView
				review={page.review}
				index={page.index}
				backHref="#"
				onChange={saved}
				onAdvise={noop}
				advising={false}
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

	if (call === "suggestLines") {
		return (
			<List
				bordered
				size="small"
				header={
					<Text type="secondary">
						Suggested tasks, as the plan editor offers them
					</Text>
				}
				dataSource={(fields.lines as string[]) ?? []}
				renderItem={(line) => <List.Item>{line}</List.Item>}
			/>
		);
	}
	return null;
}
