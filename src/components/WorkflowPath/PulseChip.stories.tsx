import type { Meta, StoryObj } from "@storybook/nextjs";
import { Flex } from "antd";
import type {
	CheckpointPulseRowDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { PulseChip } from "./PulseChip";

const sprint: CheckpointSprintDto = {
	number: 1,
	from: "2026-10-01T00:00:00.000Z",
	to: "2026-10-07T00:00:00.000Z",
	firstDay: 1,
	lastDay: 7,
	devlogDay: 7,
	state: "current",
};

const member = (
	name: string,
	role: string,
	activeDays: number[],
	state: CheckpointPulseRowDto["cells"][number]["state"],
): CheckpointPulseRowDto => ({
	memberId: name,
	userId: name,
	name,
	image: null,
	role,
	joinedAt: null,
	leftAt: null,
	activeDays,
	cells: [{ sprint: 1, state, confirmedAt: null, source: null }],
});

// Frame 07.2 (`kMsaL`), the same four people and the same days.
const team = [
	member("Marta Ilves", "Author", [1, 3, 7], "confirmed"),
	member("Oleg Kim", "Programmer", [3, 4, 7], "confirmed"),
	member("Ana Sousa", "Artist", [6, 7], "waiting"),
	member("Ivan Petrov", "Sound", [], "missed"),
];

const meta: Meta<typeof PulseChip> = {
	title: "Workflow/Pulse",
	component: PulseChip,
	parameters: { layout: "padded" },
	args: { rows: team, sprint, day: 7 },
};

export default meta;

type Story = StoryObj<typeof PulseChip>;

/** Beats on days 1, 3, 4, 6 and 7; click it for the team matrix. */
export const Default: Story = {};

/** A beat sits on the day the activity happened: last day, spread out, none. */
export const Beats: Story = {
	render: (args) => (
		<Flex vertical gap={16} align="flex-start">
			{[[7], [2, 5], [1, 3, 4, 6, 7], []].map((activeDays) => (
				<PulseChip
					key={activeDays.join() || "none"}
					{...args}
					rows={[member("Marta Ilves", "Author", activeDays, "confirmed")]}
				/>
			))}
		</Flex>
	),
};

export const NobodyAsked: Story = { args: { rows: [] } };
