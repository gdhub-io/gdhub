import type { Meta, StoryObj } from "@storybook/nextjs";
import { HubQuickCountsSkeleton } from "./HubQuickCountsSkeleton";

const meta: Meta<typeof HubQuickCountsSkeleton> = {
	title: "Components/HubQuickCountsSkeleton",
	component: HubQuickCountsSkeleton,
	parameters: { layout: "padded", viewport: { defaultViewport: "mobile1" } },
};

export default meta;

export const Loading: StoryObj<typeof HubQuickCountsSkeleton> = {};
