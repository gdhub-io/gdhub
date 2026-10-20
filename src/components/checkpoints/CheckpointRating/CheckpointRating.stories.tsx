import type { Meta, StoryObj } from "@storybook/nextjs";
import type { ReactElement } from "react";
import { CheckpointRatingView } from ".";

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

/** Frame 07.4 (`b2YQQN`): the question, empty stars and the hint. */
export const Unanswered: Story = {};

/** Frame 13.6a (`BNH67`): two stars picked open the comment and Send. */
export const Picking: Story = {
	args: { defaultRating: 2 },
};

/** Frame 13.6b (`yBg2O`). */
export const Sending: Story = {
	args: { defaultRating: 2, defaultComment: COMMENT, sending: true },
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
	args: { defaultRating: 2, defaultComment: COMMENT, failed: true },
};
