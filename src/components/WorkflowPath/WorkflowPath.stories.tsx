import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type {
	CheckpointDto,
	CheckpointPulseRowDto,
	CheckpointSessionDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { ClosedCheckpoint } from "./ClosedCheckpoint";
import { PathNode } from "./PathNode";
import { RunningCheckpoint } from "./RunningCheckpoint";

// Dated from today so the path reads as it would on the day: sprint 2, day 2.
const day = (offset: number) => {
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString();
};
const start = -8;

const sprint = (number: number, state: CheckpointSprintDto["state"]) => ({
	number,
	from: day(start + (number - 1) * 7),
	to: day(start + number * 7 - 1),
	firstDay: (number - 1) * 7 + 1,
	lastDay: number * 7,
	devlogDay: number * 7 - 1,
	state,
});

const session = (index: number, endedAt?: boolean): CheckpointSessionDto => ({
	index,
	day: (index - 1) * 7 + 1,
	scheduledAt: day(start + (index - 1) * 7),
	timeKnown: false,
	rescheduledAt: null,
	curatorJoinedAt: null,
	endedAt: endedAt ? day(start + (index - 1) * 7) : null,
	contentStatus: null,
});

const pulses: CheckpointPulseRowDto[] = [
	"Marta Ilves",
	"Oleg Kim",
	"Ana Sousa",
].map((name, row) => ({
	memberId: `m${row}`,
	userId: `u${row}`,
	name,
	image: null,
	role: null,
	joinedAt: day(-60),
	leftAt: null,
	cells: [1, 2, 3, 4].map((n) => ({
		sprint: n,
		state:
			n === 1 || (n === 2 && row === 0)
				? "confirmed"
				: n === 2
					? "waiting"
					: "notAsked",
		confirmedAt: null,
		source: null,
	})),
}));

const artifact = {
	id: "a1",
	name: "Core loop one-pager",
	type: ProjectArtifactType.Concept,
	link: "https://example.test/one-pager",
	checkStatus: null,
};

const running: CheckpointDto = {
	id: "cp3",
	projectId: "p1",
	stepId: "s2",
	stageName: "Concepting",
	order: 3,
	status: CheckpointStatus.Active,
	goal: "Lock the core loop of the tide mechanic on paper and in a greybox a stranger can play for 5 minutes.",
	curatorKind: CheckpointCuratorKind.Human,
	curator: { id: "c1", name: "Patrick Novak", image: null },
	startedAt: day(start),
	dueAt: day(start + 27),
	goalAgreedAt: day(start),
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: day(start - 2),
	curatorDeclinedAt: null,
	declinedCuratorIds: [],
	paymentId: "pay1",
	createdAt: day(start - 3),
	updatedAt: day(0),
	items: [
		{
			id: "o1",
			kind: CheckpointItemKind.Outcome,
			order: 1,
			text: "Core loop one-pager",
			originalText: null,
			cut: false,
			addedAt: null,
			note: null,
			acceptedNote: null,
			artifact,
		},
		{
			id: "o2",
			kind: CheckpointItemKind.Outcome,
			order: 2,
			text: "Greybox build on itch.io",
			originalText: null,
			cut: false,
			addedAt: null,
			note: null,
			acceptedNote: null,
			artifact: null,
		},
	],
	reports: [],
	sprints: [
		sprint(1, "done"),
		sprint(2, "current"),
		sprint(3, "ahead"),
		sprint(4, "ahead"),
	],
	sessions: [
		session(1, true),
		session(2, true),
		session(3),
		session(4),
		session(5),
	],
	pulses,
	evidence: [],
	builds: [],
	number: 3,
	previousVerdictReadAt: day(start + 1),
	day: 10,
	daysLeft: 18,
};

const closed: CheckpointDto = {
	...running,
	id: "cp2",
	status: CheckpointStatus.Closed,
	goal: "A one-page pitch and a mood board the whole team agrees on.",
	startedAt: day(-40),
	dueAt: day(-13),
	verdict: CheckpointVerdict.StageClosed,
	verdictNote:
		"The pitch is sharp and the mood board sets one clear direction.",
	decidedAt: day(-12),
};

const project = { id: "p1", name: "Hollow Tide", slug: "hollow-tide" };

const meta: Meta = {
	title: "Workflow/Path",
	parameters: { layout: "padded" },
};

export default meta;

export const HumanCurator: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 800 }}>
			<RunningCheckpoint
				checkpoint={running}
				project={project}
				previous={{ checkpoint: closed, number: 2 }}
				canManage
			/>
		</div>
	),
};

export const AICurator: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 800 }}>
			<RunningCheckpoint
				checkpoint={{
					...running,
					curatorKind: CheckpointCuratorKind.AI,
					curator: null,
				}}
				project={project}
				previous={null}
				canManage
			/>
		</div>
	),
};

export const ClosedOne: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 800 }}>
			<PathNode marker="cleared">
				<ClosedCheckpoint checkpoint={closed} number={2} />
			</PathNode>
		</div>
	),
};

export const Markers: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 400 }}>
			{(
				[
					"done",
					"current",
					"session",
					"sprint",
					"gate",
					"cleared",
					"todo",
				] as const
			).map((marker) => (
				<PathNode
					key={marker}
					marker={marker}
					rail={marker === "todo" ? "dashed" : "solid"}
				>
					<div style={{ paddingTop: 24 }}>{marker}</div>
				</PathNode>
			))}
		</div>
	),
};
