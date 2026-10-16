import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	ArtifactCheckStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { ArtifactsView } from "./ArtifactsView";
import type { ArtifactListItem } from "./artifacts";

const concepting = { id: "s1", name: "Concepting", order: 1 };
const prototyping = { id: "s2", name: "Prototyping", order: 2 };
const marta = { name: "Marta Ilves", image: null };
const tom = { name: "Tom Bauer", image: null };

const artifacts: ArtifactListItem[] = [
	{
		id: "1",
		type: ProjectArtifactType.Concept,
		name: "Hollow Tide — concept document",
		link: "https://example.com/concept",
		createdAt: "2026-07-12",
		checkStatus: ArtifactCheckStatus.Readable,
		createdByUser: marta,
		step: concepting,
	},
	{
		id: "2",
		type: ProjectArtifactType.PrototypeVideo,
		name: "Pitch video, 90 seconds",
		link: "https://example.com/pitch",
		createdAt: "2026-07-24",
		checkStatus: ArtifactCheckStatus.Pending,
		createdByUser: marta,
		step: concepting,
	},
	{
		id: "3",
		type: ProjectArtifactType.GameplayVideo,
		name: "Prototype walkthrough — full 15-minute run, narrated, with the tide loop and both grey-box levels",
		link: "https://example.com/walkthrough",
		createdAt: "2026-09-26",
		checkStatus: ArtifactCheckStatus.Readable,
		createdByUser: marta,
		step: prototyping,
	},
	{
		id: "4",
		type: ProjectArtifactType.GDD,
		name: "Level plans (Google Drive)",
		link: "https://drive.google.com/file/d/level-plans",
		createdAt: "2026-09-26",
		checkStatus: ArtifactCheckStatus.Unreachable,
		createdByUser: tom,
		step: prototyping,
	},
	{
		id: "5",
		type: ProjectArtifactType.Art,
		name: "Tide states, final art",
		link: "https://example.com/art",
		createdAt: "2026-09-26",
		checkStatus: ArtifactCheckStatus.Unsupported,
		createdByUser: tom,
		step: prototyping,
	},
	{
		id: "6",
		type: ProjectArtifactType.ExecutableBuild,
		name: null,
		link: "https://hollowtide.itch.io/prototype?secret=9f2ac1b7d04e4c7f8a1e",
		createdAt: "2026-09-27",
		checkStatus: null,
		createdByUser: tom,
		step: prototyping,
	},
	{
		id: "7",
		type: ProjectArtifactType.Other,
		name: "Old GDD (Google Docs)",
		link: "https://example.com/old-gdd",
		createdAt: "2026-03-03",
		checkStatus: null,
		createdByUser: { name: "Owen Marsh", image: null },
		step: null,
	},
];

/** The project's Artifacts tab — frames `R7JKH` and `V3HRXh`. */
const meta = {
	title: "Project/ArtifactsView",
	component: ArtifactsView,
	args: {
		artifacts,
		status: "ready",
		canManage: true,
		onRetry: () => {},
		onDelete: () => {},
	},
} satisfies Meta<typeof ArtifactsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithArtifacts: Story = {};

/** A team member who may look but not add or delete. */
export const ReadOnly: Story = { args: { canManage: false } };

export const Empty: Story = { args: { artifacts: [] } };

export const Loading: Story = { args: { artifacts: [], status: "loading" } };

export const LoadError: Story = { args: { artifacts: [], status: "error" } };
