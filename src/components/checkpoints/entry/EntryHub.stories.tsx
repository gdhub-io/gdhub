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

/** Purchase is not open yet: items 1 and 2 still work, item 3 waits. */
export const PurchaseClosed: Story = {
	args: { status: { ...entryStatusReady, purchaseOpen: false } },
};

/** Another project's checkpoint is on its way: a row to its workflow above the list. */
export const CheckpointOnItsWay: Story = {
	args: {
		status: {
			...entryStatusReady,
			hadCheckpoint: true,
			current: {
				id: "c1",
				number: 2,
				projectSlug: "tiny-orbit",
				projectName: "Tiny Orbit",
				status: "Active",
			},
		},
	},
};

export const Loading: Story = { args: { loading: true } };

export const LoadFailed: Story = { args: { error: true } };
