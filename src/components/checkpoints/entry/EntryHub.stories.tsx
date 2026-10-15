import type { Meta, StoryObj } from "@storybook/nextjs";
import { EntryHub } from "./EntryHub";
import { EntryShell } from "./EntryShell";
import {
	entryStatusAboutDone,
	entryStatusNew,
	entryStatusReady,
} from "./entry.fixtures";

const meta: Meta<typeof EntryHub> = {
	title: "Checkpoints/Entry/EntryHub",
	component: EntryHub,
	decorators: [
		(Story) => (
			<EntryShell>
				<Story />
			</EntryShell>
		),
	],
	args: { aboutSummary: "Anna Petrova · Game designer" },
};
export default meta;

type Story = StoryObj<typeof EntryHub>;

/** 12.0a: item 1 active, 2 and 3 locked. */
export const NewUser: Story = { args: { status: entryStatusNew } };

/** 12.0b: about you done, the project is next. */
export const AboutDone: Story = { args: { status: entryStatusAboutDone } };

/** 12.0c: both done, "Set the goal" opens the wizard. */
export const Ready: Story = { args: { status: entryStatusReady } };

/** The chosen project has a checkpoint under way: item 3 goes to it. */
export const Running: Story = {
	args: {
		status: {
			...entryStatusReady,
			draft: entryStatusReady.draft && {
				...entryStatusReady.draft,
				projectId: "p3",
			},
		},
	},
};

export const Loading: Story = { args: { loading: true } };

export const LoadFailed: Story = { args: { error: true } };
