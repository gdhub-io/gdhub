import type { Meta, StoryObj } from "@storybook/nextjs";
import { FormSkeleton } from ".";

const meta: Meta<typeof FormSkeleton> = {
	title: "Design system/FormSkeleton",
	component: FormSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof FormSkeleton>;

/** Project settings, General: cover and video, a narrow column, a description. */
export const ProjectGeneral: Story = {
	args: { media: 2, fields: 5, aside: 1, textarea: true },
};

/** Event settings, General: one cover above the fields. */
export const EventGeneral: Story = {
	args: { media: 1, fields: 4, textarea: true },
};

/** Plain fields: project links, certificate signer, profile general. */
export const Fields: Story = {
	args: { fields: 3 },
};

/** Fields ending in a textarea: scout general, profile interests and resources. */
export const FieldsWithTextarea: Story = {
	args: { fields: 5, textarea: true },
};
