import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { ChatComposer } from "./index";

const noop = () => undefined;

const meta: Meta<typeof ChatComposer> = {
	title: "Chat/ChatComposer",
	component: ChatComposer,
	parameters: { layout: "centered" },
	args: {
		value: "",
		onSubmit: noop,
		onCancelMode: noop,
		onAttach: noop,
		onRemoveAttachment: noop,
	},
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

const previewUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="gray"/></svg>',
)}`;

/** Frame `g3USr` case 1: shrunk in the browser, uploading; Send waits. */
export const ImageUploading: Story = {
	args: {
		attachment: {
			name: "level-03-sketch.webp",
			previewUrl,
			status: "uploading",
			progress: 0.42,
		},
	},
};

/** Frame `g3USr` case 2: uploaded; the text becomes the image's caption. */
export const ImageReady: Story = {
	args: {
		value: "Level 3 blockout — thoughts?",
		attachment: {
			name: "level-03-sketch.webp",
			previewUrl,
			status: "ready",
			size: 1_468_006,
		},
	},
};

/** Frame `g3USr` case 3: over the server limit even after shrinking. */
export const ImageTooLarge: Story = {
	args: {
		attachment: {
			name: "trailer-raw.png",
			status: "error",
			error: "File too large (max 10 MB)",
		},
	},
};

/** Frame `Z3xk5b`: the notice slot, as the Announcements composer uses it. */
export const WithNotice: Story = {
	args: {
		notice: <span>Posting as GDHub</span>,
	},
};
