import type { Meta, StoryObj } from "@storybook/nextjs";
import { IconInbox, IconMessageDots } from "@tabler/icons-react";
import { Button, Flex } from "antd";
import { UnreadDot } from ".";

const meta: Meta<typeof UnreadDot> = {
	title: "UI/UnreadDot",
	component: UnreadDot,
};
export default meta;
type Story = StoryObj<typeof UnreadDot>;

/** 07.02.1: both header icons, as the header draws them. */
const pair = (unread: boolean, open = false) => (
	<Flex gap={8}>
		<Button
			type="text"
			shape="circle"
			size="small"
			style={open ? { background: "var(--gd-fill-strong)" } : undefined}
			icon={
				<UnreadDot unread={unread}>
					<IconMessageDots size={20} stroke={1.75} />
				</UnreadDot>
			}
		/>
		<Button
			type="text"
			shape="circle"
			size="small"
			icon={
				<UnreadDot unread={unread}>
					<IconInbox size={20} stroke={1.75} />
				</UnreadDot>
			}
		/>
	</Flex>
);

export const NothingUnread: Story = { render: () => pair(false) };
export const Unread: Story = { render: () => pair(true) };
export const ChatOpen: Story = { render: () => pair(true, true) };
