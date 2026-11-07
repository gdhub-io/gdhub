import type { Meta, StoryObj } from "@storybook/nextjs";
import { CoursesListSkeleton } from "./CoursesListSkeleton";

const meta: Meta<typeof CoursesListSkeleton> = {
	title: "Components/CoursesListSkeleton",
	component: CoursesListSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

export const Loading: StoryObj<typeof CoursesListSkeleton> = {};
