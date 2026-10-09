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
import { CheckpointOffer } from "./CheckpointOffer";
import { ClosedCheckpoint } from "./ClosedCheckpoint";
import { PathBranch, PathNode } from "./PathNode";
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
	activeDays: [1, 3, 7].slice(0, row + 1),
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
	curatorAcceptedAt: null,
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
			<PathBranch ahead>
				<RunningCheckpoint
					checkpoint={running}
					project={project}
					previous={{ checkpoint: closed, number: 2 }}
					canManage
					here={null}
				/>
			</PathBranch>
		</div>
	),
};

/** Day one: the call that opens Sprint 1 is today and has not happened yet. */
export const HumanCuratorSessionToday: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 800 }}>
			<PathBranch ahead>
				<RunningCheckpoint
					checkpoint={{
						...running,
						startedAt: day(0),
						sprints: [1, 2, 3, 4].map((number) => ({
							...sprint(number, number === 1 ? "current" : "ahead"),
							from: day((number - 1) * 7),
							to: day(number * 7 - 1),
						})),
						sessions: [1, 2, 3, 4, 5].map((index) => ({
							...session(index),
							scheduledAt: day((index - 1) * 7),
						})),
						number: 1,
						day: 1,
						daysLeft: 27,
					}}
					project={project}
					previous={null}
					canManage
					here={null}
				/>
			</PathBranch>
		</div>
	),
};

export const AICurator: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 800 }}>
			<PathBranch ahead>
				<RunningCheckpoint
					checkpoint={{
						...running,
						curatorKind: CheckpointCuratorKind.AI,
						curator: null,
					}}
					project={project}
					previous={null}
					canManage
					here={null}
				/>
			</PathBranch>
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

// Where each marker's centre falls in its row: its offset plus half its size.
const MARKER_CENTRE = {
	stageDone: 28,
	stageCurrent: 36,
	done: 34,
	current: 38,
	session: 72,
	review: 72,
	sprint: 13,
	gate: 26,
	cleared: 20,
	todo: 38,
} as const;

const markerRow = (marker: keyof typeof MARKER_CENTRE, rail?: "dashed") => (
	<PathNode key={marker} marker={marker} rail={rail}>
		{/* The label's 20px line sits on the marker's centre. */}
		<div style={{ paddingTop: MARKER_CENTRE[marker] - 10, lineHeight: "20px" }}>
			{marker}
		</div>
	</PathNode>
);

/** Every marker on the line, the stage's own checkpoint markers on its branch. */
export const Markers: StoryObj = {
	render: () => (
		<div style={{ maxWidth: 400 }}>
			{markerRow("stageDone")}
			{markerRow("stageCurrent")}
			<PathBranch ahead>
				{markerRow("cleared")}
				{markerRow("done")}
				{markerRow("current")}
				{markerRow("session")}
				{markerRow("review")}
				{markerRow("sprint")}
				{markerRow("gate", "dashed")}
			</PathBranch>
			{markerRow("todo", "dashed")}
		</div>
	),
};

const draft: CheckpointDto = {
	...running,
	id: "cp4",
	status: CheckpointStatus.Draft,
	goal: "A playable greybox five strangers can finish in 15 minutes.",
	curator: { id: "c1", name: "Marta Ilves", image: null },
	paymentId: null,
	acceptedTermsAt: null,
	startedAt: day(4),
	dueAt: day(31),
};

const offer = (state: CheckpointDto | null, locked = false) => (
	<div style={{ maxWidth: 800 }}>
		<CheckpointOffer project={project} draft={state} first locked={locked} />
	</div>
);

/** Frames 02 and 02.1: the offer, then the four states of the draft it becomes. */
export const Offer: StoryObj = { render: () => offer(null) };

/** Purchase not open yet (CHECKPOINTS_PURCHASE_OPEN off): the offer, locked. */
export const OfferLocked: StoryObj = { render: () => offer(null, true) };

export const OfferDraft: StoryObj = { render: () => offer(draft) };

export const OfferPaymentFailed: StoryObj = {
	render: () =>
		offer({ ...draft, acceptedTermsAt: day(0), paymentFailed: true }),
};

export const OfferWaitingForCurator: StoryObj = {
	render: () =>
		offer({
			...draft,
			status: CheckpointStatus.AwaitingCurator,
			paymentId: "pay1",
		}),
};

export const OfferCuratorDeclined: StoryObj = {
	render: () =>
		offer({
			...draft,
			paymentId: "pay1",
			curator: null,
			curatorDeclinedAt: day(0),
		}),
};

/** Every face of the card on one page: the offer, locked, and the draft's four states. */
export const OfferAllStates: StoryObj = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 32,
				maxWidth: 800,
			}}
		>
			{[
				["Offer", null, false],
				["Offer — purchase not open yet", null, true],
				[
					"Draft — saved at Now",
					{ ...draft, goal: "", startedAt: null, dueAt: null, curator: null },
					false,
				],
				["Draft — setup not finished", draft, false],
				[
					"Payment did not go through",
					{ ...draft, acceptedTermsAt: day(0), paymentFailed: true },
					false,
				],
				[
					"Paid, waiting for the curator",
					{
						...draft,
						status: CheckpointStatus.AwaitingCurator,
						paymentId: "pay1",
					},
					false,
				],
				[
					"Curator declined",
					{
						...draft,
						paymentId: "pay1",
						curator: null,
						curatorDeclinedAt: day(0),
					},
					false,
				],
			].map(([label, state, locked]) => (
				<div key={label as string}>
					<p style={{ margin: "0 0 8px", opacity: 0.6 }}>{label as string}</p>
					<CheckpointOffer
						project={project}
						draft={state as CheckpointDto | null}
						first
						locked={locked as boolean}
					/>
				</div>
			))}
		</div>
	),
};
