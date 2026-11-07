import type { Meta, StoryObj } from "@storybook/nextjs";
import { Flex } from "antd";
import { SkeletonLine } from ".";

const meta: Meta<typeof SkeletonLine> = {
	title: "Design system/SkeletonLine",
	component: SkeletonLine,
	parameters: { layout: "padded" },
};

export default meta;

export const Lines: StoryObj<typeof SkeletonLine> = {
	render: () => (
		<Flex vertical gap={8}>
			<SkeletonLine width={240} height={32} />
			<SkeletonLine width="60%" />
			<SkeletonLine width={96} height={12} />
		</Flex>
	),
};
