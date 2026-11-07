import type { Meta, StoryObj } from "@storybook/nextjs";
import { CourseGridSkeleton } from "./CourseSkeleton";

const meta: Meta<typeof CourseGridSkeleton> = {
	title: "Components/CourseGridSkeleton",
	component: CourseGridSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

export const Loading: StoryObj<typeof CourseGridSkeleton> = {};
