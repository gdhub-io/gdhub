import type { Meta, StoryObj } from "@storybook/nextjs";
import { VacanciesListSkeleton } from "./VacanciesListSkeleton";

const meta: Meta<typeof VacanciesListSkeleton> = {
	title: "Components/VacanciesListSkeleton",
	component: VacanciesListSkeleton,
	parameters: { layout: "padded" },
};

export default meta;

export const Loading: StoryObj<typeof VacanciesListSkeleton> = {};
