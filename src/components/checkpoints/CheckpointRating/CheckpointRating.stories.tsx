import type { Meta, StoryObj } from "@storybook/nextjs";
import { type ReactElement, useState } from "react";
import { userEvent, within } from "storybook/test";
import { CheckpointRatingView, type CheckpointRatingViewProps } from ".";

const COMMENT =
	"It read the pitch well, but the video was out of scope for this goal — that's why it says missed.";

const meta: Meta<typeof CheckpointRatingView> = {
	title: "Checkpoints/CheckpointRating",
	component: CheckpointRatingView,
	args: { feedback: null, onSend: () => {} },
	decorators: [
		// The results modal's body width.
		(Story: () => ReactElement) => (
			<div style={{ maxWidth: 592 }}>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof CheckpointRatingView>;

const pickTwoStars = async (canvasElement: HTMLElement) => {
	const canvas = within(canvasElement);
	await userEvent.click(canvas.getAllByRole("radio")[1]);
};

const pickAndComment = async (canvasElement: HTMLElement) => {
	await pickTwoStars(canvasElement);
	await userEvent.type(within(canvasElement).getByRole("textbox"), COMMENT);
};

/** Frame 07.4 (`b2YQQN`): the question, empty stars and the hint. */
export const Unanswered: Story = {};

/** Frame 13.6a (`BNH67`): two stars picked open the comment and Send. */
export const Picking: Story = {
	play: ({ canvasElement }) => pickTwoStars(canvasElement),
};

/** Frame 13.6b (`yBg2O`): Send pressed, the answer on its way. */
export const Sending: Story = {
	render: function Render(args: CheckpointRatingViewProps) {
		const [sending, setSending] = useState(false);
		return (
			<CheckpointRatingView
				{...args}
				sending={sending}
				onSend={() => setSending(true)}
			/>
		);
	},
	play: async ({ canvasElement }) => {
		await pickAndComment(canvasElement);
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Send" }),
		);
	},
};

/** Frame 13.6c (`OjHOg`): final, no edit. */
export const Sent: Story = {
	args: {
		feedback: {
			rating: 2,
			comment: COMMENT,
			createdAt: "2026-09-12T10:00:00.000Z",
		},
	},
};

export const SentWithoutComment: Story = {
	args: {
		feedback: {
			rating: 4,
			comment: null,
			createdAt: "2026-09-12T10:00:00.000Z",
		},
	},
};

/** Frame 13.6e (`AWBjC`): nothing saved, values kept, Send retries. */
export const SendFailed: Story = {
	args: { failed: true },
	play: ({ canvasElement }) => pickAndComment(canvasElement),
};
