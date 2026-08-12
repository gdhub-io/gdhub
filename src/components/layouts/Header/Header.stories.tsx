import type { Meta, StoryObj } from "@storybook/nextjs";
import { IconBell, IconMessageCircle } from "@tabler/icons-react";
import { Avatar, Button, Space, Typography } from "antd";
import { Header } from "./index";

const { Text } = Typography;

/**
 * The right-side actions shared by every authenticated layout. Mirrors the real
 * widgets (ChatButton, NotificationsBell, user avatar) which can't run in
 * Storybook because they need session / react-query / websocket context — same
 * icons (@tabler/icons-react) and circular text buttons so it matches the app.
 */
const headerActions = (
	<Space align="center" size={8}>
		<Button type="text" style={{ fontSize: 14 }}>
			Documentation
		</Button>
		<Button
			type="text"
			shape="circle"
			icon={<IconMessageCircle size={18} stroke={1.75} />}
		/>
		<Button
			type="text"
			shape="circle"
			icon={<IconBell size={18} stroke={1.75} />}
		/>
		<Avatar size={32} style={{ backgroundColor: "#E3B6B6" }} />
	</Space>
);

/**
 * The shared authenticated header. The logo and the right-side actions
 * (documentation, chat, notifications, avatar) stay the same everywhere; only
 * the breadcrumbs after the logo change per section. The stories below show how
 * it looks inside my/project, my/event, my/course and the hub.
 */
const meta = {
	title: "Layouts/Header",
	component: Header,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		actions: headerActions,
	},
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A project — no parent crumb: projects live on the hub home, not on a list. */
export const Project: Story = {
	args: {
		trail: {
			current: { label: "Echo Signal" },
			space: { kind: "project", id: "p1" },
		},
	},
};

/** An event, with its list above it. */
export const Event: Story = {
	args: {
		trail: {
			parent: { href: "/user/events", label: "My events" },
			current: { label: "GameDev Meetup 2026" },
			space: { kind: "event", id: "e1" },
		},
	},
};

/** A course, likewise. */
export const Course: Story = {
	args: {
		trail: {
			parent: { href: "/user/courses", label: "My courses" },
			current: { label: "Unreal Engine Basics" },
			space: { kind: "course", id: "c1" },
		},
	},
};

/** The admin space: a trail, but no entry in the switcher. */
export const Admin: Story = {
	args: {
		trail: {
			parent: { href: "/admin/users", label: "Admin" },
			current: { label: "Users" },
		},
	},
};

/** No space — the hub and ordinary pages name who is signed in. */
export const Hub: Story = {
	args: {
		fallback: (
			<Space size={8} align="center">
				<Avatar size={24}>D</Avatar>
				<Text>Dmitry Drynov</Text>
			</Space>
		),
	},
};

/** Logo only. */
export const LogoOnly: Story = {
	args: {},
};
