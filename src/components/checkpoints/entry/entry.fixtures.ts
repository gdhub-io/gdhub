import {
	ArtifactCheckStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type {
	CheckpointArtifactRef,
	EntryProjectDto,
	EntryStatusDto,
} from "@/types/checkpoints";

/** Story data for the way into a checkpoint (row 12.x). */

export const entryProjects: EntryProjectDto[] = [
	{
		id: "p1",
		slug: "lantern-keeper",
		name: "Lantern Keeper",
		cover: null,
		stage: "Ideation",
		running: false,
	},
	{
		id: "p2",
		slug: "salt-and-iron",
		name: "Salt and Iron",
		cover: null,
		stage: "Prototyping",
		running: false,
	},
	{
		id: "p3",
		slug: "tiny-orbit",
		name: "Tiny Orbit",
		cover: null,
		stage: "Preparing a demo version",
		running: true,
	},
];

export const entryArtifact = (
	id: string,
	name: string,
	type: ProjectArtifactType = ProjectArtifactType.Other,
): CheckpointArtifactRef => ({
	id,
	name,
	type,
	link: `https://example.com/${id}`,
	checkStatus: ArtifactCheckStatus.Readable,
});

export const entryStatusNew: EntryStatusDto = {
	aboutDone: false,
	hadCheckpoint: false,
	projects: [],
	draft: null,
};

export const entryStatusAboutDone: EntryStatusDto = {
	...entryStatusNew,
	aboutDone: true,
	projects: entryProjects,
};

export const entryStatusReady: EntryStatusDto = {
	...entryStatusAboutDone,
	draft: {
		id: "d1",
		projectId: "p1",
		items: [
			{
				text: "A playable greybox of the first level",
				artifact: entryArtifact(
					"a1",
					"greybox-build.zip",
					ProjectArtifactType.ExecutableBuild,
				),
			},
			{
				text: "Design doc for the core loop",
				artifact: entryArtifact("a2", "Core loop", ProjectArtifactType.GDD),
			},
			{ text: "Mood board and lantern sketches", artifact: null },
		],
	},
};
