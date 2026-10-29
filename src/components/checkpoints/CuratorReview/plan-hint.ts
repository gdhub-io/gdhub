import type { useTranslate } from "@tolgee/react";
import type { PlanEdit } from "@/lib/checkpoints/call";

export const planHint = (
	t: ReturnType<typeof useTranslate>["t"],
	edit: PlanEdit,
) => {
	if (edit === "goalAndTasks") {
		return t(
			"checkpoints.review.plan.dayOneHint",
			"Write 1 to 5 tasks that will show the goal is reached. Each one should end in something anyone can open: a build, a document, a video. Add the curator's suggestions or write your own.",
		);
	}
	if (edit === "tasks") {
		return t(
			"checkpoints.review.plan.midHint",
			"Change the tasks yourself or take the curator's suggestions, then confirm them. This is the last change in this checkpoint: done tasks stay as they are, and the first wording of each task is kept.",
		);
	}
	return undefined;
};
