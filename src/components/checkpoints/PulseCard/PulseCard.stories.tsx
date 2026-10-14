import type { Meta, StoryObj } from "@storybook/nextjs";
import { App } from "antd";
import type { PulseViewDto } from "@/repositories/checkpoint-pulse";
import { PulseCard } from ".";

// Frames 09.1–09.3: Marta, Hollow Tide, the third sprint of checkpoint 2.
const open: PulseViewDto = {
	state: "open",
	firstName: "Marta",
	project: { name: "Hollow Tide", slug: "hollow-tide" },
	number: 2,
	sprint: 3,
	from: "2026-10-15T00:00:00.000Z",
	to: "2026-10-21T00:00:00.000Z",
	cells: [
		{ sprint: 1, state: "confirmed" },
		{ sprint: 2, state: "confirmed" },
		{ sprint: 3, state: "waiting" },
		{ sprint: 4, state: "notAsked" },
	],
};

const meta: Meta<typeof PulseCard> = {
	title: "Checkpoints/PulseCard",
	component: PulseCard,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			<App>
				<Story />
			</App>
		),
	],
	args: { view: open, token: "storybook" },
};

export default meta;

type Story = StoryObj<typeof PulseCard>;

/** 09.1 — the question, with the sprint waiting in the brand colour. */
export const Open: Story = {};

/** A sprint without an answer shows a dash. */
export const OpenWithMissed: Story = {
	args: {
		view: {
			...open,
			cells: [
				{ sprint: 1, state: "confirmed" },
				{ sprint: 2, state: "missed" },
				{ sprint: 3, state: "waiting" },
				{ sprint: 4, state: "notAsked" },
			],
		},
	},
};

/** Sprints before joining are not drawn; the strip says where it starts. */
export const JoinedMidCheckpoint: Story = {
	args: {
		view: {
			...open,
			cells: [
				{ sprint: 3, state: "waiting" },
				{ sprint: 4, state: "notAsked" },
			],
		},
	},
};

/** 09.2 — answered; the same link opened again lands here. */
export const Confirmed: Story = {
	args: {
		view: {
			...open,
			state: "confirmed",
			cells: [
				{ sprint: 1, state: "confirmed" },
				{ sprint: 2, state: "confirmed" },
				{ sprint: 3, state: "confirmed" },
				{ sprint: 4, state: "notAsked" },
			],
		},
	},
};

/** 09.3 — past the next call, or a token that does not resolve. */
export const Closed: Story = { args: { view: null } };
