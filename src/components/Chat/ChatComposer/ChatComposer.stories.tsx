import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { ChatComposer } from "./index";

const noop = () => undefined;

const meta: Meta<typeof ChatComposer> = {
	title: "Chat/ChatComposer",
	component: ChatComposer,
	parameters: { layout: "centered" },
	args: { value: "", onSubmit: noop, onCancelMode: noop },
	decorators: [
		(Story) => (
			<div style={{ width: 520, background: "var(--gd-color-surface)" }}>
				<Story />
			</div>
		),
	],
	render: function Render(args) {
		const [value, setValue] = useState(args.value);
		return <ChatComposer {...args} value={value} onChange={setValue} />;
	},
};

export default meta;

type Story = StoryObj<typeof ChatComposer>;

/** Send stays disabled until there is text. */
export const Empty: Story = {};

export const WithText: Story = {
	args: { value: "Wishlists doubled after the store page test 🎉" },
};

/** Frame `X7HUy`: the reply strip above the text. */
export const Replying: Story = {
	args: {
		mode: {
			type: "reply",
			eventId: "$a",
			senderName: "Anna Volkova",
			preview: "How did the store page test go?",
		},
	},
};

/** Frame `hycZ7`: editing, prefilled, Save instead of Send. */
export const Editing: Story = {
	args: {
		value: "Posting the numbers in a sec",
		mode: {
			type: "edit",
			eventId: "$b",
			original: "Posting the numbers in a sec",
		},
	},
};
