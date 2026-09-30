import type { Meta, StoryObj } from "@storybook/nextjs";
import { roomsFixture } from "../fixtures/rooms";
import { ChatRoomRow } from "./index";

const noop = () => undefined;

const meta: Meta<typeof ChatRoomRow> = {
	title: "Chat/ChatRoomRow",
	component: ChatRoomRow,
	parameters: { layout: "centered" },
	args: {
		onSelect: noop,
		onMarkRead: noop,
		onCloseChat: noop,
		onLeave: noop,
	},
	decorators: [
		(Story) => (
			<div style={{ width: 520, background: "var(--gd-color-surface)" }}>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ChatRoomRow>;

/** Unread advice chat with its kind tag and project label; hover shows the menu trigger. */
export const UnreadAdvice: Story = { args: { room: roomsFixture[0] } };

/** Own last message gets the "You:" prefix. */
export const OwnPreview: Story = { args: { room: roomsFixture[1] } };

/** A pending invite reads as unread until answered. */
export const Invite: Story = { args: { room: roomsFixture[2] } };

export const Direct: Story = { args: { room: roomsFixture[3] } };

export const DeletedPreview: Story = { args: { room: roomsFixture[4] } };

/** Closed: the menu has nothing to close any more. */
export const Closed: Story = { args: { room: roomsFixture[5] } };
