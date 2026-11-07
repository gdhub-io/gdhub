import type { Meta, StoryObj } from "@storybook/nextjs";
import { ExpertListSkeleton } from "./ExpertListSkeleton";

const meta: Meta<typeof ExpertListSkeleton> = {
	title: "Components/ExpertListSkeleton",
	component: ExpertListSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

export const Loading: StoryObj<typeof ExpertListSkeleton> = {};
