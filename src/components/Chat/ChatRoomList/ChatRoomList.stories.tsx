import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { manyRoomsFixture, roomsFixture } from "../fixtures/rooms";
import type { ChatTab } from "../model/rooms";
import { ChatRoomList } from "./index";

const noop = () => undefined;

const meta: Meta<typeof ChatRoomList> = {
	title: "Chat/ChatRoomList",
	component: ChatRoomList,
	parameters: { layout: "centered" },
	args: {
		rooms: roomsFixture,
		tab: "all",
		onTabChange: noop,
		onSelect: noop,
		onMarkRead: noop,
		onCloseChat: noop,
		onLeave: noop,
		onToggleMute: noop,
	},
	// The panel's body: 520 × 720, as in the Chat · Panel frames.
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: 520,
					height: 720,
					background: "var(--gd-color-surface)",
					border: "1px solid var(--gd-color-border)",
					borderRadius: "var(--gd-radius-panel)",
					overflow: "hidden",
				}}
			>
				<Story />
			</div>
		),
	],
	render: function Render(args) {
		const [tab, setTab] = useState<ChatTab>(args.tab);
		return <ChatRoomList {...args} tab={tab} onTabChange={setTab} />;
	},
};

export default meta;

type Story = StoryObj<typeof ChatRoomList>;

/** Frame `Ut6hz`: every row variant — unread, own preview, invite, deleted. */
export const All: Story = {};

/** Frame `UyyF9`: unread chats and the pending invite. */
export const Unread: Story = { args: { tab: "unread" } };

/** Closed chats stay readable here. */
export const Closed: Story = { args: { tab: "closed" } };

/** Frame `J4zJj`. */
export const ClosedEmpty: Story = {
	args: {
		tab: "closed",
		rooms: roomsFixture.filter((room) => room.status === "Open"),
	},
};

/** Frame `B3iV0`: no conversations at all. */
export const Empty: Story = { args: { rooms: [] } };

/** Unread tab with nothing new. */
export const UnreadEmpty: Story = {
	args: { tab: "unread", rooms: [roomsFixture[3]] },
};

/** Frame `b1i1k`: the first sync is still running. */
export const Loading: Story = { args: { rooms: null } };

/** Frame `n5vQ2`: the Matrix client failed to start. */
export const ConnectionError: Story = {
	args: { error: true, onRetry: noop },
};

/** 55 rooms: the list renders 20 and appends more as you scroll. */
export const LongList: Story = { args: { rooms: manyRoomsFixture } };
