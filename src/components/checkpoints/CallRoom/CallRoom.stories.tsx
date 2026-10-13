import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import type {
	CallNotesDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import { CallHeader, type CallHeaderProps } from "./CallHeader";
import { NotesBlock } from "./CallNotes";
import {
	CallClosed,
	CallLayout,
	CallPersonRow,
	CallTeamPanel,
	LiveStage,
	ParticipantTile,
} from "./CallParts";
import { PlanBlock } from "./CallPlan";
import { type CallDevices, PreJoin, type PreJoinProps } from "./PreJoin";

const NOW = new Date("2026-10-08T11:50:00.000Z");
const noop = () => undefined;
const saved = () => Promise.resolve();

const GOAL =
	"Lock the core loop of the tide mechanic on paper and in a greybox a stranger can play for 5 minutes.";

const plan: CheckpointCallDto["plan"] = {
	goal: GOAL,
	goalAgreedAt: "2026-10-01T13:00:00.000Z",
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
	index: 2,
	number: 3,
	stageName: "Concepting",
	project: { name: "Hollow Tide", slug: "hollow-tide" },
	curator: { id: "u-curator", name: "Patrick Novak", image: null },
	scheduledAt: "2026-10-08T12:00:00.000Z",
	opensAt: "2026-10-08T11:45:00.000Z",
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
		stage: <CallClosed text="The room opens at 13:45" />,
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
		stage: <CallClosed text="This call is over" />,
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

export const PlanCallOneEditable: Story = {
	render: () => (
		<PlanBlock
			curatorName="Patrick"
			onChange={saved}
			plan={{
				goal: GOAL,
				goalAgreedAt: null,
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

export const PlanCallThree: Story = {
	render: () => (
		<PlanBlock
			curatorName="Patrick"
			onChange={saved}
			plan={{ ...plan, edit: "tasks" }}
		/>
	),
};

export const PlanReadOnly: Story = {
	render: () => (
		<PlanBlock curatorName="Patrick" onChange={saved} plan={plan} />
	),
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

function NotesStory({ held, notes }: { held: number; notes?: CallNotesDto }) {
	const sessions = sessionsHeld(held);
	const [selected, setSelected] = useState<number | null>(held || null);
	return (
		<NotesBlock
			sessions={sessions}
			plan={plan}
			selected={selected}
			onSelect={setSelected}
			notes={notes}
			loading={false}
		/>
	);
}

export const NotesPending: Story = {
	render: () => (
		<NotesStory
			held={2}
			notes={{ contentStatus: "Pending", content: null, transcript: null }}
		/>
	),
};

export const NotesReady: Story = {
	render: () => <NotesStory held={2} notes={notesReady} />,
};

export const NotesNothingHeldYet: Story = {
	render: () => <NotesStory held={0} />,
};
