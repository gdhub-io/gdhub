import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { Flex } from "antd";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointCard } from "./CheckpointCard";
import { CheckpointStatusSlot } from "./CheckpointStatusSlot";
import { CuratorBadge } from "./CuratorBadge";
import { VerdictChip } from "./VerdictChip";

const base: CheckpointDto = {
	id: "cp1",
	projectId: "p1",
	stepId: "step-3",
	stageName: "Prototyping",
	order: 2,
	status: CheckpointStatus.Active,
	goal: "A playable vertical slice with two tide states and one boss encounter.",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: "2026-09-01T09:00:00.000Z",
	dueAt: "2026-09-28T09:00:00.000Z",
	goalAgreedAt: "2026-09-01T15:00:00.000Z",
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: "2026-09-01T08:55:00.000Z",
	createdAt: "2026-09-01T08:40:00.000Z",
	updatedAt: "2026-09-14T09:00:00.000Z",
	items: [],
	day: 14,
	daysLeft: 14,
};

const meta: Meta = { title: "Checkpoints/Pieces" };

export default meta;

export const Verdicts: StoryObj = {
	render: () => (
		<Flex gap={24}>
			<VerdictChip verdict={CheckpointVerdict.StageClosed} />
			<VerdictChip verdict={CheckpointVerdict.GoalMet} />
			<VerdictChip verdict={CheckpointVerdict.GoalMissed} />
		</Flex>
	),
};

export const Curators: StoryObj = {
	render: () => (
		<Flex gap={24}>
			<CuratorBadge kind={CheckpointCuratorKind.AI} />
			<CuratorBadge
				kind={CheckpointCuratorKind.Human}
				curator={{ name: "Marta Ilves", image: null }}
			/>
		</Flex>
	),
};

/** The three faces of the one status slot, plus the draft. */
export const StatusSlot: StoryObj = {
	render: () => (
		<Flex gap={24}>
			<CheckpointStatusSlot checkpoint={base} />
			<CheckpointStatusSlot
				checkpoint={{ ...base, status: CheckpointStatus.Review }}
			/>
			<CheckpointStatusSlot
				checkpoint={{
					...base,
					status: CheckpointStatus.Closed,
					verdict: CheckpointVerdict.StageClosed,
				}}
			/>
			<CheckpointStatusSlot
				checkpoint={{ ...base, status: CheckpointStatus.Draft, day: null }}
			/>
		</Flex>
	),
};

export const RunningCard: StoryObj = {
	render: () => <CheckpointCard checkpoint={base} projectSlug="neon-drift" />,
};

/** Nothing charged, no days counting, and a way back into the flow. */
export const DraftCard: StoryObj = {
	render: () => (
		<CheckpointCard
			checkpoint={{
				...base,
				status: CheckpointStatus.Draft,
				goal: "",
				startedAt: null,
				dueAt: null,
				day: null,
				daysLeft: null,
			}}
			projectSlug="neon-drift"
			onDiscard={() => {}}
		/>
	),
};

export const AwaitingVerdict: StoryObj = {
	render: () => (
		<CheckpointCard
			checkpoint={{
				...base,
				status: CheckpointStatus.Review,
				day: 28,
				daysLeft: 0,
				curatorKind: CheckpointCuratorKind.Human,
				curator: { id: "u1", name: "Marta Ilves", image: null },
			}}
			projectSlug="neon-drift"
		/>
	),
};
