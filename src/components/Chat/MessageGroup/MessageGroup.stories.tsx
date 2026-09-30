import type { Meta, StoryObj } from "@storybook/nextjs";
import { messageFixture } from "../fixtures/timeline";
import type { DeliveryStatus } from "../model/timeline";
import { MessageGroup } from "./index";

const meta: Meta<typeof MessageGroup> = {
	title: "Chat/MessageGroup",
	component: MessageGroup,
	parameters: { layout: "centered" },
	args: { senderName: "Anna Volkova", avatarMxc: null, ts: Date.now() },
	decorators: [
		(Story) => (
			<div
				style={{
					width: 472,
					padding: 16,
					background: "var(--gd-color-surface)",
				}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof MessageGroup>;

/** Someone else: avatar, name and time once, then the bubbles. */
export const Other: Story = {
	args: {
		own: false,
		messages: [
			messageFixture({ id: "1", text: "Hi! I read your question." }),
			messageFixture({
				id: "2",
				text: "Short answer: one paid DLC first, then a season pass once you know the attach rate.",
			}),
		],
	},
};

const ownWith = (status: DeliveryStatus): Story => ({
	args: {
		own: true,
		senderName: "Me",
		onRetry: () => undefined,
		messages: [
			messageFixture({ id: "1", own: true, text: "Wishlists doubled 🎉" }),
			messageFixture({
				id: "2",
				own: true,
				text: "Posting the numbers",
				status,
			}),
		],
	},
});

export const OwnSending = ownWith("sending");
export const OwnSent = ownWith("sent");
export const OwnRead = ownWith("read");
/** A failed send carries its own Retry. */
export const OwnFailed = ownWith("failed");

export const EditedAndDeleted: Story = {
	args: {
		own: false,
		messages: [
			messageFixture({ id: "1", text: "Fixed the typo", edited: true }),
			messageFixture({ id: "2", text: "…", deleted: true }),
		],
	},
};
