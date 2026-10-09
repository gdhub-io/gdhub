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
	devlogDay: 6,
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

/** Two confirmed beats; click it for the team matrix. */
export const Default: Story = {};

/** The trace at every count the chip draws — a flat line is nobody yet. */
export const Beats: Story = {
	render: (args) => (
		<Flex vertical gap={16} align="flex-start">
			{[0, 1, 2, 4, 6].map((beats) => (
				<PulseChip
					key={beats}
					{...args}
					rows={Array.from({ length: beats }, (_, index) =>
						member(`Member ${index + 1}`, "Team", [1], "confirmed"),
					)}
				/>
			))}
		</Flex>
	),
};

export const NobodyAsked: Story = { args: { rows: [] } };
