import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { CuratorMessage } from "@/components/checkpoints/CuratorReview/CuratorMessage";
import { CuratorReviewSkeleton } from "@/components/checkpoints/CuratorReview/CuratorReviewSkeleton";
import type {
	CallNotesDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import { GoalCard } from "./CallGoal";
import { CallHeader, type CallHeaderProps } from "./CallHeader";
import { PanelBlock, type PanelTab } from "./CallPanel";
import {
	CallLayout,
	CallPersonRow,
	CallTeamPanel,
	LiveStage,
	ParticipantTile,
} from "./CallParts";
import { type CallDevices, PreJoin, type PreJoinProps } from "./PreJoin";

const NOW = new Date("2026-10-08T11:50:00.000Z");
const noop = () => undefined;
const saved = () => Promise.resolve();

const GOAL =
	"Lock the core loop of the tide mechanic on paper and in a greybox a stranger can play for 5 minutes.";

const plan: CheckpointCallDto["plan"] = {
	goal: GOAL,
	goalAgreedAt: "2026-10-01T13:00:00.000Z",
	advice: null,
	edit: null,
	tasks: [
		{
			id: "t1",
			text: "Core loop one-pager",
			cut: false,
			addedAt: null,
			artifact: {
				id: "a1",
				name: "Core loop",
				type: "GDD",
				link: "https://example.com/core-loop",
				checkStatus: null,
			},
		},
		{
			id: "t2",
			text: "Greybox build on itch.io, playable in the browser",
			cut: false,
			addedAt: null,
			artifact: null,
		},
		{
			id: "t3",
			text: "Devlog — what the tide taught us",
			cut: true,
			addedAt: null,
			artifact: null,
		},
		{
			id: "t4",
			text: "3 playtest recordings with strangers",
			cut: false,
			addedAt: "2026-10-15T12:30:00.000Z",
			artifact: null,
		},
	],
};

const sessionDates = [
	"2026-10-01T12:00:00.000Z",
	"2026-10-08T12:00:00.000Z",
	"2026-10-15T12:00:00.000Z",
	"2026-10-22T12:00:00.000Z",
	"2026-10-29T12:00:00.000Z",
];

const sessionsHeld = (held: number): CheckpointCallDto["sessions"] =>
	sessionDates.map((scheduledAt, index) => ({
		index: index + 1,
		scheduledAt,
		held: index < held,
		contentStatus: index < held ? "Ready" : null,
	}));

const call: CheckpointCallDto = {
	checkpointId: "cp1",
	previous: null,
	index: 2,
	number: 3,
	stageName: "Concepting",
	project: { id: "p1", name: "Hollow Tide", slug: "hollow-tide" },
	curator: { id: "u-curator", name: "Patrick Novak", image: null },
	scheduledAt: "2026-10-08T12:00:00.000Z",
	state: "open",
	curatorJoinedAt: null,
	role: "team",
	plan,
	sessions: sessionsHeld(1),
};

const header = (
	overrides: Partial<CallHeaderProps> & {
		state?: CheckpointCallDto["state"];
	} = {},
) => (
	<CallHeader
		call={{ ...call, state: overrides.state ?? call.state }}
		backHref="/user/project/hollow-tide/workflow"
		joined={false}
		onChat={noop}
		onCopyLink={noop}
		now={NOW}
		{...overrides}
	/>
);

const device = (label: string) => ({
	options: [{ value: label, label }],
	value: label,
	onChange: noop,
});

const devices: CallDevices = {
	camera: device("FaceTime HD Camera"),
	microphone: device("MacBook Pro Microphone"),
	speaker: device("MacBook Pro Speakers"),
};

const prejoin: PreJoinProps = {
	mode: "waiting",
	viewer: "team",
	curator: call.curator,
	startsAt: "14:00",
	self: { name: "Marta Ilves" },
	micOn: true,
	camOn: false,
	onToggleMic: noop,
	onToggleCam: noop,
	devices,
	micLevel: 0.15,
	onTestSound: noop,
	onJoin: noop,
};

const meta: Meta<typeof CallLayout> = {
	title: "Checkpoints/Call room",
	component: CallLayout,
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 1200 }}>
				<Story />
			</div>
		),
	],
};
export default meta;

type Story = StoryObj<typeof CallLayout>;

export const Early: Story = {
	args: {
		header: header({ state: "early" }),
		stage: (
			<CuratorMessage
				curator={{ name: "Patrick Novak", image: null }}
				date="8 Oct, 14:00"
				message="Our call is on Thursday 8 Oct at 14:00. The room opens 15 minutes before; you'll be let in as soon as I join."
				actions={[
					{
						key: "calendar",
						label: "Add to calendar",
						primary: true,
						onClick: noop,
					},
					{ key: "chat", label: "Message Patrick", onClick: noop },
				]}
			/>
		),
	},
};

export const WaitingForCurator: Story = {
	args: {
		header: header(),
		stage: <PreJoin {...prejoin} />,
	},
};

export const ReadyToJoin: Story = {
	args: {
		header: header(),
		stage: <PreJoin {...prejoin} mode="ready" />,
	},
};

export const CuratorReady: Story = {
	args: {
		header: header(),
		stage: <PreJoin {...prejoin} mode="ready" viewer="curator" />,
	},
};

export const Over: Story = {
	args: {
		header: header({ state: "over" }),
		stage: (
			<CuratorMessage
				curator={{ name: "Patrick Novak", image: null }}
				date="8 Oct"
				message="The call is over. The plan is below, and the notes from the call will be here within the hour — everyone gets a letter when they're ready."
				actions={[
					{
						key: "notes",
						label: "Open the notes",
						primary: true,
						onClick: noop,
					},
				]}
			/>
		),
	},
};

const people = [
	{ name: "Patrick Novak", role: "Curator", muted: false },
	{ name: "Marta Ilves", role: undefined, muted: false },
	{ name: "Oleg Kim", role: undefined, muted: true },
	{ name: "Ana Sousa", role: undefined, muted: false },
];

const toggle = (on: boolean) => ({ on, onToggle: noop });

export const LiveGrid: Story = {
	args: {
		header: header({ joined: true, onLeave: noop, onEnd: noop }),
		stage: (
			<LiveStage
				count={people.length}
				recording
				mic={toggle(true)}
				camera={toggle(true)}
				sharing={toggle(false)}
				fullscreen={toggle(false)}
			>
				{people.map((person, index) => (
					<ParticipantTile
						key={person.name}
						name={person.name}
						role={person.role}
						muted={person.muted}
						speaking={index === 0}
					/>
				))}
			</LiveStage>
		),
		aside: (
			<CallTeamPanel count={people.length}>
				{people.map((person, index) => (
					<CallPersonRow
						key={person.name}
						name={person.name}
						role={person.role ?? (index === 1 ? "You" : undefined)}
					/>
				))}
			</CallTeamPanel>
		),
	},
};

export const GoalReadOnly: Story = {
	render: () => <GoalCard goal={GOAL} editable={false} onSave={saved} />,
};

export const GoalEditable: Story = {
	render: () => <GoalCard goal={GOAL} editable onSave={saved} />,
};

const notesReady: CallNotesDto = {
	contentStatus: "Ready",
	content: {
		inShort:
			"A strong week on the core loop. The risk now is scope: three islands will not fit in 28 days — prove that one island is fun before building the next.",
		discussed: [
			{
				itemId: "t1",
				text: "The loop runs end to end. The second rise of the tide comes too fast — players cannot learn the rhythm before it hits.",
			},
			{
				itemId: "t2",
				text: "The first island is blocked out; outrunning the tide works in 3 of 5 tries. Polish this island and drop the other two — that is the checkpoint.",
			},
		],
		notDiscussed: ["t3"],
		outsidePlan: ["A HUD warning for the incoming tide was sketched."],
		agreed: [
			{ text: "Slow the first two tide cycles", itemId: "t2", dueDay: 14 },
			{ text: "Playtest with three strangers", itemId: "t4", dueDay: 14 },
			{ text: "Put the tide warning on the HUD", itemId: null, dueDay: 14 },
		],
		questions: [
			"Does the level still fit in 15 minutes once the tide is slower?",
			"Is a second character worth a checkpoint of its own?",
		],
	},
	transcript:
		"We start with the core loop. The one-pager reads well.\n\nThe second tide is the problem — it comes too fast.",
};

function PanelStory({
	current,
	held,
	tab: initialTab,
	panelPlan = plan,
	notes,
}: {
	current: number;
	held: number;
	tab: PanelTab;
	panelPlan?: CheckpointCallDto["plan"];
	notes?: CallNotesDto;
}) {
	const [selected, setSelected] = useState(current);
	const [tab, setTab] = useState(initialTab);
	return (
		<PanelBlock
			sessions={sessionsHeld(held)}
			current={current}
			selected={selected}
			onSelect={setSelected}
			tab={tab}
			onTab={setTab}
			plan={panelPlan}
			onChange={saved}
			notes={notes}
			notesLoading={false}
			now={new Date(sessionDates[current - 1])}
		/>
	);
}

export const PanelPlanCallThree: Story = {
	render: () => (
		<PanelStory
			current={3}
			held={2}
			tab="plan"
			panelPlan={{ ...plan, edit: "tasks" }}
		/>
	),
};

export const PanelPlanCallOne: Story = {
	render: () => (
		<PanelStory
			current={1}
			held={0}
			tab="plan"
			panelPlan={{
				goal: GOAL,
				goalAgreedAt: null,
				advice: null,
				edit: "goalAndTasks",
				tasks: [
					{ id: "t1", text: "Core loop one-pager" },
					{ id: "t2", text: "Greybox build on itch.io" },
					{ id: "t3", text: "5 playtest recordings" },
				].map((task) => ({
					...task,
					cut: false,
					addedAt: null,
					artifact: null,
				})),
			}}
		/>
	),
};

export const PanelPlanReadOnly: Story = {
	render: () => <PanelStory current={2} held={1} tab="plan" />,
};

export const PanelNotesReady: Story = {
	render: () => (
		<PanelStory current={3} held={2} tab="notes" notes={notesReady} />
	),
};

export const PanelNotesEmptySections: Story = {
	render: () => (
		<PanelStory
			current={3}
			held={2}
			tab="notes"
			notes={{
				...notesReady,
				content: notesReady.content && {
					...notesReady.content,
					outsidePlan: [],
					questions: [],
				},
			}}
		/>
	),
};

export const PanelNotesPending: Story = {
	render: () => (
		<PanelStory
			current={3}
			held={3}
			tab="notes"
			notes={{ contentStatus: "Pending", content: null, transcript: null }}
		/>
	),
};

/** Curator's Review while it loads — pro and ai share it. */
export const Loading: Story = {
	render: () => <CuratorReviewSkeleton />,
};
