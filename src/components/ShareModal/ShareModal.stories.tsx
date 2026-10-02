import type { Meta, StoryObj } from "@storybook/nextjs";
import { App } from "antd";
import { ShareModal } from ".";

const meta: Meta<typeof ShareModal> = {
	title: "Modals/Share post",
	component: ShareModal,
	args: {
		target: {
			path: "/devlog/abc",
			text: "Hollow Tide — devlog on GDHub",
			image: "/api/og-blog?t=Hollow+Tide&u=gdhub.io%2Fdevlog",
		},
		onClose: () => {},
	},
	decorators: [
		(Story) => (
			<App>
				<Story />
			</App>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ShareModal>;

export const Open: Story = {};
