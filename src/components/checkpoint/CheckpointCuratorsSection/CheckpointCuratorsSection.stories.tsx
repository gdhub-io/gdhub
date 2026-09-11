import type { Meta, StoryObj } from "@storybook/nextjs";
import type { FeaturedCurator } from "@/repositories/checkpoint-curators";
import { CheckpointCuratorsSection } from "./index";

const CURATORS: FeaturedCurator[] = [
	{
		id: "1",
		role: "Game Designer",
		name: "Marta Ilves",
		specialization: "Systems & Level Design",
		summary:
			"Systems and level design for mid-core games. Helps teams turn broad ideas into a playable, reviewable scope.",
		image: null,
		topics: ["Scope", "Combat design", "Level flow"],
	},
	{
		id: "2",
		role: "Technical Director",
		name: "Jonas Petrauskas",
		specialization: "Engine & Pipelines",
		summary:
			"Unity and Unreal pipelines, architecture and production risks. Finds the version of the plan the build can carry.",
		image: null,
		topics: ["Unreal", "Build pipeline"],
	},
	{
		id: "3",
		role: "Art Director",
		name: "Elena Kovac",
		specialization: "Visual Direction & 2D",
		summary:
			"Visual direction for small teams. Turns a vague look into a concrete art milestone.",
		image: null,
		topics: [],
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
	"https://images.unsplash.com/photo-1621827442209-a9167d710ecf?w=440",
	"https://images.unsplash.com/photo-1580835919673-429540898832?w=440",
	"https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=440",
];

export const WithPhotos: Story = {
	args: {
		curators: CURATORS.map((curator, index) => ({
			...curator,
			image: PHOTOS[index],
		})),
	},
};

/** No photo on file — the frame stays empty rather than borrowing a stranger. */
export const WithoutPhotos: Story = { args: { curators: CURATORS } };

/** Nobody on the platform qualifies yet: the section takes itself off the page. */
export const Empty: Story = { args: { curators: [] } };
