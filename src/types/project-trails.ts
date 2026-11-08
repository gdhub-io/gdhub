/** Where a public project stands, as the trails graph colours it. */
export type ProjectTrailStatus =
	| "inProgress"
	| "released"
	| "abandoned"
	| "cancelled";

export type ProjectTrailCheckpointStatus = "active" | "review" | "closed";

export type ProjectTrailCheckpointDto = {
	order: number;
	status: ProjectTrailCheckpointStatus;
	startedAt: string | null;
};

export type ProjectTrailStageDto = {
	name: string;
	/** Its place in the whole workflow, from 1. */
	number: number;
	checkpoints: ProjectTrailCheckpointDto[];
};

/** One project's road from the start to the stage it is on now, the last stage being the current one. */
export type ProjectTrailDto = {
	id: string;
	slug: string;
	name: string;
	coverImage: string | null;
	status: ProjectTrailStatus;
	/** `gameScores` among the projects on the graph, 0..100. */
	score: number;
	stages: ProjectTrailStageDto[];
	/** Stages in the project's whole workflow, reached or not. */
	stageCount: number;
	/** The stage after the current one; null on the last. */
	nextStage: string | null;
};
