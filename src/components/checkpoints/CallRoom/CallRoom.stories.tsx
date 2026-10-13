import type { Meta, StoryObj } from "@storybook/nextjs";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import { CallHeader, type CallHeaderProps } from "./CallHeader";
import {
	CallClosed,
	CallLayout,
	CallPersonRow,
	CallTeamPanel,
	LiveStage,
	ParticipantTile,
} from "./CallParts";
import { type CallDevices, PreJoin, type PreJoinProps } from "./PreJoin";

const NOW = new Date("2026-10-08T11:50:00.000Z");
const noop = () => undefined;

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
