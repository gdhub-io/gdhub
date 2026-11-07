import type { Meta, StoryObj } from "@storybook/nextjs";
import { AdviceRequestsSkeleton } from "./AdviceRequestsSkeleton";

const meta: Meta<typeof AdviceRequestsSkeleton> = {
	title: "Components/AdviceRequestsSkeleton",
	component: AdviceRequestsSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

export const Loading: StoryObj<typeof AdviceRequestsSkeleton> = {};
