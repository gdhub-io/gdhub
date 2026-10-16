import type { Meta, StoryObj } from "@storybook/nextjs";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import { ComposerView } from "./ComposerView";

const meta: Meta<typeof ComposerView> = {
	title: "Modals/Devlog composer",
	component: ComposerView,
	args: {
		open: true,
		author: { name: "Marta Ilves", image: null },
		context: "Hollow Tide · Prototyping",
		onCancel: () => {},
		onSubmit: () => {},
	},
};

export default meta;

type Story = StoryObj<typeof ComposerView>;

export const Empty: Story = {};

export const WithContent: Story = {
	args: {
		initialData: {
			blocks: [
				{
					type: "header",
					data: {
						text: "Art for state one, and a save bug we cannot reproduce",
						level: 2,
					},
				},
				{
					type: "paragraph",
					data: {
						text: "State one has art and it reads. The tide switch keeps the timing from checkpoint 1.",
					},
				},
				{
					type: "list",
					data: {
						style: "unordered",
						meta: {},
						items: [
							"Tide state one — art in, lighting pass done",
							"Save system — corrupts about one run in twenty",
						].map((content) => ({ content, meta: {}, items: [] })),
					},
				},
				{
					type: "quote",
					data: {
						text: "The switch finally feels like weather, not a button.",
						caption: "Tom, playtest",
						alignment: "left",
					},
				},
			],
		},
	},
};

export const EditLoading: Story = {
	args: { editing: true, loading: true },
};

export const FullScreen: Story = {
	args: WithContent.args,
	play: () => {
		document
			.querySelector<HTMLButtonElement>('[aria-label="Full screen"]')
			?.click();
	},
};

export const Mobile: Story = {
	args: WithContent.args,
	parameters: { viewport: { options: INITIAL_VIEWPORTS } },
	globals: { viewport: { value: "iphone12", isRotated: false } },
};
