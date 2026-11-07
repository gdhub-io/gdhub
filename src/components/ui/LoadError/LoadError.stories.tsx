import type { Meta, StoryObj } from "@storybook/nextjs";
import { LoadError } from "./index";

/** The error rows of frames `ZssMc` and `P5Bfq`. */
const meta: Meta<typeof LoadError> = {
	title: "Design system/LoadError",
	component: LoadError,
	parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof LoadError>;

export const WithRetry: Story = {
	args: { title: "Your documents could not be loaded", onRetry: () => {} },
};
