import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	announcementsFixture,
	mutedFixture,
	roomsFixture,
} from "../fixtures/rooms";
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
		onToggleMute: noop,
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
export const UnreadAdvice: Story = { args: { room: roomsFixture[2] } };

/** Own last message gets the "You:" prefix. */
export const OwnPreview: Story = { args: { room: roomsFixture[3] } };

/** A pending invite reads as unread until answered. */
export const Invite: Story = { args: { room: roomsFixture[4] } };

export const Direct: Story = { args: { room: roomsFixture[5] } };

export const DeletedPreview: Story = { args: { room: roomsFixture[6] } };

/** Closed: the menu has nothing to close any more. */
export const Closed: Story = { args: { room: roomsFixture[7] } };

/** Announcements: megaphone, pin mark and the hairline closing the top group; menu has Mark as read and Mute only. */
export const Pinned: Story = { args: { room: announcementsFixture } };

/** Pinned and muted: the menu offers Unmute. */
export const PinnedMuted: Story = {
	args: { room: { ...announcementsFixture, muted: true } },
};

/** Muted offer chat: bell-off mark, grey count; menu is Mark as read, Unmute, Close chat…. */
export const Muted: Story = { args: { room: mutedFixture } };
