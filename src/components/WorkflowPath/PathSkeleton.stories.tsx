import type { Meta, StoryObj } from "@storybook/nextjs";
import { PathSkeleton } from "./PathSkeleton";

const meta: Meta<typeof PathSkeleton> = {
	title: "Workflow/PathSkeleton",
	component: PathSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

export const Loading: StoryObj<typeof PathSkeleton> = {};
