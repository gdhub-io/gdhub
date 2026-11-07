import type { Meta, StoryObj } from "@storybook/nextjs";
import { PageLoading } from ".";

const meta: Meta<typeof PageLoading> = {
	title: "Design system/PageLoading",
	component: PageLoading,
	parameters: { layout: "padded" },
};

export default meta;

export const Default: StoryObj<typeof PageLoading> = {};
