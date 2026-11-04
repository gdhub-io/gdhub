import type { Meta, StoryObj } from "@storybook/nextjs";
import { SkillLevel } from "@/config/prisma-enums";
import type { FeaturedCurator } from "@/types/checkpoints";
import { CheckpointCuratorsSection } from "./index";

const CURATORS: FeaturedCurator[] = [
	{
		id: "1",
		role: "Game Designer",
		name: "Marta Ilves",
		level: SkillLevel.Expert,
		summary:
			"Systems and level design for mid-core games. Helps teams turn broad ideas into a playable, reviewable scope.",
		image: null,
	},
	{
		id: "2",
		role: "Technical Director",
		name: "Jonas Petrauskas",
		level: SkillLevel.Expert,
		summary:
			"Unity and Unreal pipelines, architecture and production risks. Finds the version of the plan the build can carry.",
		image: null,
	},
	{
		id: "3",
		role: "Art Director",
		name: "Elena Kovac",
		level: SkillLevel.Experienced,
		summary:
			"Visual direction for small teams. Turns a vague look into a concrete art milestone.",
		image: null,
	},
	{
		id: "4",
		role: "Producer",
		name: "Tomas Reyes",
		level: SkillLevel.Expert,
		summary:
			"Scope, milestones and the awkward call. Keeps a 28-day plan honest when the team would rather not hear it.",
		image: null,
	},
];

const meta: Meta<typeof CheckpointCuratorsSection> = {
	title: "Landing/CheckpointCuratorsSection",
	component: CheckpointCuratorsSection,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof CheckpointCuratorsSection>;

const PHOTOS = [
	"https://images.unsplash.com/photo-1621827442209-a9167d710ecf?w=560",
	"https://images.unsplash.com/photo-1580835919673-429540898832?w=560",
	"https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=560",
	"https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=560",
];

export const WithPhotos: Story = {
	args: {
		curators: CURATORS.map((curator, index) => ({
			...curator,
			image: PHOTOS[index],
		})),
	},
};

/** No photo on file — an empty frame rather than a stranger's face. */
export const WithoutPhotos: Story = { args: { curators: CURATORS } };

/** Nobody on the platform qualifies yet: the section takes itself off the page. */
export const Empty: Story = { args: { curators: [] } };
