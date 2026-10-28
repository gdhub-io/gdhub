import type { Meta, StoryObj } from "@storybook/nextjs";
import { Flex } from "antd";
import {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
	SkillLevel,
} from "@/config/prisma-enums";
import { sprintFactsOf } from "@/lib/checkpoint-facts";
import type { CheckpointDto, CheckpointItemDto } from "@/types/checkpoints";
import { AskPanel } from "./AskPanel";
import { CheckpointCard } from "./CheckpointCard";
import { CheckpointPath } from "./CheckpointPath";
import { CheckpointStatusSlot } from "./CheckpointStatusSlot";
import { CheckpointStepPanel } from "./CheckpointStepPanel";
import { CuratorBadge } from "./CuratorBadge";
import { GoalStrip } from "./GoalStrip";
import { InputsPanel } from "./InputsPanel";
import { PaidPanel } from "./PaidPanel";
import { Evidence } from "./SprintPanel/Evidence";
import { Review } from "./SprintPanel/Review";
import { Room } from "./SprintPanel/Room";
import { Signals } from "./SprintPanel/Signals";
import { VerdictChip } from "./VerdictChip";

const startedAt = "2026-09-01T09:00:00.000Z";

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
	startedAt,
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
	declinedCuratorIds: [],
	curatorAcceptedAt: null,
	curatorDeclinedAt: null,
	paymentId: null,
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

/** The day is a chip; the verdict and the waiting states are dots. */
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

const curator = {
	id: "u1",
	name: "Marta Ilves",
	image: null,
	speciality: { name: "Game design", level: SkillLevel.Expert },
};

/** Frame `TJ2dF`: sprint 2 under way, one outcome reworded and one cut. */
export const RunningCard: StoryObj = {
	render: () => (
		<CheckpointCard
			checkpoint={{
				...base,
				curatorKind: CheckpointCuratorKind.Human,
				curator,
				items,
				sprints,
			}}
			projectSlug="neon-drift"
		/>
	),
};

/** The AI curator, before any outcome is written: no task row at all. */
export const RunningCardAI: StoryObj = {
	render: () => (
		<CheckpointCard
			checkpoint={{ ...base, sprints }}
			projectSlug="neon-drift"
		/>
	),
};

/** Paid for, and the curator handed it back — frames `qIt2j` and `Ct1UR`. */
export const CuratorDeclined: StoryObj = {
	render: () => (
		<PaidPanel
			checkpoint={{
				...base,
				status: CheckpointStatus.Draft,
				curatorDeclinedAt: "2026-09-18T09:00:00.000Z",
				paymentId: null,
				curator: null,
				items,
				day: null,
				daysLeft: null,
			}}
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
				curator,
				items,
				sprints: sprints.map((sprint) => ({ ...sprint, state: "done" })),
			}}
			projectSlug="neon-drift"
		/>
	),
};

/** The path, mid-checkpoint: sprint 2 is where the author lives today. */
export const Path: StoryObj = {
	render: () => (
		<CheckpointPath
			selected="sprint-2"
			onSelect={() => {}}
			next={{ disabled: true, reason: "Opens when the verdict is in." }}
			steps={[
				{
					key: "inputs",
					label: "Inputs",
					meta: "what was bought",
					glyph: "start",
				},
				{ key: "sprint-1", label: "Sprint 1", meta: "1–7 Sep", glyph: "done" },
				{
					key: "sprint-2",
					label: "Sprint 2",
					meta: "8–14 Sep",
					glyph: "current",
					needsYou: true,
				},
				{
					key: "sprint-3",
					label: "Sprint 3",
					meta: "15–21 Sep",
					glyph: "ahead",
				},
				{
					key: "sprint-4",
					label: "Sprint 4",
					meta: "22–28 Sep",
					glyph: "ahead",
				},
				{
					key: "checkpoint",
					label: "Checkpoint",
					meta: "28 Sep",
					glyph: "locked",
				},
			]}
		/>
	),
};

/** Before it is paid for: every step after the first is undated and grey. */
export const PathBeforePayment: StoryObj = {
	render: () => (
		<CheckpointPath
			selected="inputs"
			onSelect={() => {}}
			footNote="The dates appear once it is paid and the day it starts is set."
			steps={[
				{
					key: "inputs",
					label: "Prepare",
					meta: "buying the 28 days",
					glyph: "current",
				},
				{ key: "sprint-1", label: "Sprint 1", glyph: "ahead" },
				{ key: "sprint-2", label: "Sprint 2", glyph: "ahead" },
				{ key: "sprint-3", label: "Sprint 3", glyph: "ahead" },
				{ key: "sprint-4", label: "Sprint 4", glyph: "ahead" },
				{ key: "checkpoint", label: "Checkpoint", glyph: "locked" },
			]}
		/>
	),
};

/** What a sprint still asks, and who it waits on. */
export const Asks: StoryObj = {
	render: () => (
		<AskPanel
			title="What this sprint asks of you"
			info="Everything still open in this sprint, and who it waits on."
			count="2 open"
			rows={[
				{
					key: "scope",
					glyph: "open",
					title: "Check the scope",
					owner: "You",
					due: "due today",
					dueUrgent: true,
					meta: "Three of four outcomes have nothing claimed against them.",
				},
				{
					key: "marks",
					glyph: "todo",
					title: "A mark is missing",
					owner: "Team",
					due: "4 of 5",
					meta: "Lena Novak",
				},
			]}
		/>
	),
};

/** Answered: the head turns green and the forward button unlocks. */
export const AsksNothingOpen: StoryObj = {
	render: () => (
		<AskPanel
			title="What this sprint asks of you"
			count="nothing open"
			countDone
			rows={[
				{
					key: "none",
					glyph: "done",
					title: "Nothing is waiting on anyone",
					meta: "The devlog is in, the review is in, and five of five marked the sprint.",
				},
			]}
		/>
	),
};

const sprints = [1, 2, 3, 4].map((number) => ({
	number,
	from: `2026-09-${String((number - 1) * 7 + 1).padStart(2, "0")}T00:00:00.000Z`,
	to: `2026-09-${String(number * 7).padStart(2, "0")}T00:00:00.000Z`,
	firstDay: (number - 1) * 7 + 1,
	lastDay: number * 7,
	devlogDay: number * 7,
	state: (number < 2 ? "done" : number === 2 ? "current" : "ahead") as
		| "done"
		| "current"
		| "ahead",
}));

/** Every face the matrix has, including the blank one that is not a miss. */
export const TeamSignals: StoryObj = {
	render: () => (
		<Signals
			sprint={sprints[1]}
			checkpoint={{
				...base,
				sprints,
				pulses: [
					{
						memberId: "m1",
						userId: "u1",
						name: "Marta Ilves",
						image: null,
						role: "Author",
						joinedAt: null,
						leftAt: null,
						activeDays: [],
						cells: ["confirmed", "confirmed", "notAsked", "notAsked"].map(
							(state, index) => ({
								sprint: index + 1,
								state: state as "confirmed" | "notAsked",
								confirmedAt:
									state === "confirmed" ? "2026-09-10T00:00:00.000Z" : null,
								source: "app",
							}),
						),
					},
					{
						memberId: "m2",
						userId: "u2",
						name: "Lena Novak",
						image: null,
						role: "Game designer",
						joinedAt: null,
						leftAt: null,
						activeDays: [],
						cells: ["missed", "waiting", "notAsked", "notAsked"].map(
							(state, index) => ({
								sprint: index + 1,
								state: state as "missed" | "waiting" | "notAsked",
								confirmedAt: null,
								source: null,
							}),
						),
					},
					{
						memberId: "m3",
						userId: "u3",
						name: "Owen Marsh",
						image: null,
						role: "QA",
						joinedAt: "2026-09-08T00:00:00.000Z",
						leftAt: null,
						activeDays: [],
						cells: ["notOnTeam", "confirmed", "notAsked", "notAsked"].map(
							(state, index) => ({
								sprint: index + 1,
								state: state as "notOnTeam" | "confirmed" | "notAsked",
								confirmedAt:
									state === "confirmed" ? "2026-09-12T00:00:00.000Z" : null,
								source: "devlog",
							}),
						),
					},
				],
			}}
		/>
	),
};

const artifact = {
	id: "a1",
	name: "Tide prototype build 14",
	type: ProjectArtifactType.ExecutableBuild,
	link: "https://example.com/build-14",
	checkStatus: ArtifactCheckStatus.Readable,
};

const items: CheckpointItemDto[] = [
	{
		id: "i1",
		kind: CheckpointItemKind.Input,
		order: 1,
		text: "A grey-box level with one tide cycle.",
		originalText: null,
		cut: false,
		addedAt: null,
		note: null,
		acceptedNote: null,
		evidence: [],
	},
	{
		id: "o1",
		kind: CheckpointItemKind.Outcome,
		order: 1,
		text: "Two tide states the player can read without a tutorial.",
		originalText: null,
		cut: false,
		addedAt: null,
		note: null,
		acceptedNote: null,
		evidence: [{ artifact, match: null, matchNote: null }],
	},
	{
		id: "o2",
		kind: CheckpointItemKind.Outcome,
		order: 2,
		text: "One boss encounter, start to finish.",
		originalText: "One boss encounter with two phases.",
		cut: false,
		addedAt: null,
		note: null,
		acceptedNote: null,
		evidence: [],
	},
	{
		id: "o3",
		kind: CheckpointItemKind.Outcome,
		order: 3,
		text: "A second playable character.",
		originalText: null,
		cut: true,
		addedAt: null,
		note: null,
		acceptedNote: null,
		evidence: [],
	},
];

const withItems: CheckpointDto = { ...base, items, sprints };

export const Goal: StoryObj = {
	render: () => <GoalStrip goal={base.goal} />,
};

export const Inputs: StoryObj = {
	render: () => <InputsPanel checkpoint={withItems} />,
};

/** Bought, and the curator has not taken the 28 days yet — nothing listed either side. */
export const InputsBeforeTheCuratorAnswers: StoryObj = {
	render: () => (
		<InputsPanel
			checkpoint={{
				...base,
				items: [],
				curatorKind: CheckpointCuratorKind.Human,
				curator: { id: "u1", name: "Marta Ilves", image: null },
				startedAt: null,
			}}
		/>
	),
};

export const Verdict: StoryObj = {
	render: () => (
		<CheckpointStepPanel
			checkpoint={{
				...withItems,
				status: CheckpointStatus.Closed,
				verdict: CheckpointVerdict.GoalMet,
				verdictNote:
					"The slice reads. Tides are legible in under a minute of play, and the boss holds its shape end to end.",
				decidedAt: "2026-09-30T09:00:00.000Z",
			}}
		/>
	),
};

/** Day 28 has not come: the count is the only thing there is to say. */
export const VerdictLocked: StoryObj = {
	render: () => <CheckpointStepPanel checkpoint={withItems} />,
};

export const VerdictBeingWritten: StoryObj = {
	render: () => (
		<CheckpointStepPanel
			checkpoint={{ ...withItems, status: CheckpointStatus.Review }}
		/>
	),
};

const evidenced: CheckpointDto = {
	...withItems,
	evidence: [
		{
			artifact,
			addedAt: "2026-09-11T09:00:00.000Z",
			addedBy: { id: "u1", name: "Marta Ilves", image: null },
			itemIds: ["o1"],
			sprint: 2,
		},
	],
};

export const SprintEvidence: StoryObj = {
	render: () => (
		<Evidence
			checkpoint={evidenced}
			facts={sprintFactsOf(evidenced, sprints[1])}
		/>
	),
};

export const SprintEvidenceEmpty: StoryObj = {
	render: () => (
		<Evidence
			checkpoint={withItems}
			facts={sprintFactsOf(withItems, sprints[1])}
		/>
	),
};

/** Day 15 falls in sprint 3: the scope note waits there until it is answered. */
const scoped: CheckpointDto = {
	...withItems,
	midNote:
		"Nothing is claimed against the second boss phase yet. Keep it, cut it, or reword it before sprint 3 eats it.",
	revisedAt: null,
};

export const SprintReview: StoryObj = {
	render: () => <Review facts={sprintFactsOf(scoped, sprints[2])} />,
};

export const SprintReviewEmpty: StoryObj = {
	render: () => <Review facts={sprintFactsOf(withItems, sprints[1])} />,
};

/** A person curates: the call's placeholder, with the notes of it underneath. */
export const SprintRoom: StoryObj = {
	render: () => <Room facts={sprintFactsOf(scoped, sprints[2])} />,
};

export const SprintRoomEmpty: StoryObj = {
	render: () => <Room facts={sprintFactsOf(withItems, sprints[1])} />,
};
