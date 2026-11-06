import type { useTranslate } from "@tolgee/react";
import { CHECKPOINT_MAX_ITEMS_PER_KIND } from "@/config/checkpoint";
import type { PlanEdit } from "@/lib/checkpoints/call";

export const planHint = (
	t: ReturnType<typeof useTranslate>["t"],
	edit: PlanEdit,
) => {
	if (edit === "goalAndTasks") {
		return t(
			"checkpoints.review.plan.dayOneLine",
			"1–{max} tasks, each ending in a build, a document or a video anyone can open.",
			{ max: CHECKPOINT_MAX_ITEMS_PER_KIND },
		);
	}
	if (edit === "tasks") {
		return t(
			"checkpoints.review.plan.midLine",
			"Last change in this checkpoint: done tasks stay, and each task keeps its first wording.",
		);
	}
	return undefined;
};
