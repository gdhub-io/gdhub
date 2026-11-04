import {
	E2E_PROJECT,
	E2E_ROAD,
} from "@/services/checkpoints/ai-curator-lab/situations/e2e-road";

/**
 * What the e2e flows type into the platform, taken from E2E Test Game's road
 * (GDHUB-140): the same project the AI curator lab and the unit tests read, so
 * a recorded answer can be read against the road it belongs to.
 */
const [prototyping, again] = E2E_ROAD.filter(
	(checkpoint) => checkpoint.stage === "Prototyping",
);

const devlogsOf = (sprint: number) =>
	prototyping.sprints[sprint - 1].devlogs.map((post) => post.text);

export const GAME = {
	name: E2E_PROJECT.name,
	description: E2E_PROJECT.pitch,
	genre: E2E_PROJECT.genre,
	/** What the author lists as done on day 1. */
	doneSoFar: prototyping.inputs[0].text,
	goal: prototyping.goal,
	/** The goal of the checkpoint after it, for a second one. */
	nextGoal: again.goal,
	tasks: prototyping.tasks.map((task) => task.text),
	devlog: {
		sprint1: devlogsOf(1)[0],
		sprint2: devlogsOf(2)[0],
		sprint4: devlogsOf(4),
	},
	/** The verdict note of a checkpoint that missed its goal, as the road tells it. */
	missedBecause: prototyping.because,
};
