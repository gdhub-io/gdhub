import type { Meta, StoryObj } from "@storybook/nextjs";
import { FormatIcu } from "@tolgee/format-icu";
import { Tolgee, TolgeeProvider } from "@tolgee/react";
import type { ReactElement } from "react";
import WorkflowTasksPanel from "./index";

// Minimal Tolgee instance so `useTranslate` resolves to the inline defaults
// (`t(key, "Default {value}")`) without hitting the Tolgee server.
const tolgee = Tolgee()
	.use(FormatIcu())
	.init({
		defaultLanguage: "en",
		availableLanguages: ["en"],
		staticData: { en: {} },
	});

const meta: Meta<typeof WorkflowTasksPanel> = {
	title: "Components/Workflow/TasksPanel",
	component: WorkflowTasksPanel,
	parameters: { layout: "padded" },
	argTypes: {
		showHint: { control: "boolean" },
	},
	args: {
		showHint: true,
	},
	decorators: [
		(Story: () => ReactElement) => (
			<TolgeeProvider tolgee={tolgee} fallback={null}>
				<div style={{ width: 380 }}>
					<Story />
				</div>
			</TolgeeProvider>
		),
	],
};

export default meta;

type Story = StoryObj<typeof WorkflowTasksPanel>;

/** Typical Ideation step: one required task done, one pending, one optional. */
export const Default: Story = {
	args: {
		tasks: [
			{
				id: "1",
				label: "Describe your game idea in the project description",
				required: true,
				done: true,
			},
			{
				id: "2",
				label: "Define the core concept and genre",
				required: true,
				done: false,
			},
			{
				id: "3",
				label: "Post your first devlog about the idea",
				required: false,
				done: false,
			},
		],
	},
};

/** All required tasks done — the step can be completed (optional still open). */
export const AllRequiredDone: Story = {
	args: {
		tasks: [
			{
				id: "1",
				label: "Describe your game idea in the project description",
				required: true,
				done: true,
			},
			{
				id: "2",
				label: "Define the core concept and genre",
				required: true,
				done: true,
			},
			{
				id: "3",
				label: "Post your first devlog about the idea",
				required: false,
				done: false,
			},
		],
	},
};

/** Only optional tasks — no required progress badge, step is not gated. */
export const OptionalOnly: Story = {
	args: {
		tasks: [
			{
				id: "1",
				label: "Publish a devlog about the prototype",
				required: false,
				done: true,
			},
			{
				id: "2",
				label: "Open a vacancy if you need extra hands",
				required: false,
				done: false,
			},
		],
	},
};

/** A single required, pending task. */
export const SingleRequired: Story = {
	args: {
		tasks: [
			{
				id: "1",
				label: "Prepare a concept document (GDD outline)",
				required: true,
				done: false,
			},
		],
	},
};

/**
 * `m11cX` / `G2bg4o`: the checkpoint's tasks lead — the owed devlog, then the
 * author's own outcomes for day 28 — with deadlines, outside the gate count.
 */
export const WithCheckpointTask: Story = {
	args: {
		tasks: [
			{
				id: "cp-devlog",
				label: "Publish the sprint 2 devlog",
				required: false,
				done: false,
				due: { label: "by Sat, 10 Oct", overdue: false },
			},
			{
				id: "cp-o1",
				label: "A combat system with three enemy types",
				required: false,
				done: true,
				due: { label: "by Sun, 25 Oct", overdue: false },
			},
			{
				id: "cp-o2",
				label: "A settings screen with audio and controls",
				required: false,
				done: false,
				due: { label: "by Sun, 25 Oct", overdue: false },
			},
			{
				id: "1",
				label: "Describe your game idea in the project description",
				required: true,
				done: true,
			},
			{
				id: "2",
				label: "Define the core concept and genre",
				required: true,
				done: false,
			},
		],
	},
};

export const WithOverdueCheckpointTask: Story = {
	args: {
		tasks: [
			{
				id: "cp-devlog",
				label: "Publish the sprint 2 devlog",
				required: false,
				done: false,
				due: { label: "Overdue since Sat, 10 Oct", overdue: true },
			},
			{
				id: "2",
				label: "Define the core concept and genre",
				required: true,
				done: false,
			},
		],
	},
};
