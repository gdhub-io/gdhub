"use client";

import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import { useEffect } from "react";
import type { CuratorNow } from "@/lib/checkpoints/curator-now";

/** What the author does about it: the page turns it into a link or a button. */
export type CuratorNowAction = "tasks" | "plan" | "review" | "verdict";

// setTimeout overflows past ~24.8 days; returning to the tab asks anyway.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * The AI curator's message right now, and the one thing it asks for — the same
 * words on the Workflow widget and on Curator's Review. The page asks again
 * once, when the message is next likely to change; coming back to the tab asks
 * too, and nothing polls.
 */
export const useCuratorNow = (
	now: CuratorNow | null | undefined,
	/** The query to ask again; none where nothing is fetched (the lab, stories). */
	queryKey: QueryKey | null,
) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const nextAt = now?.nextAt;
	const key = JSON.stringify(queryKey);

	useEffect(() => {
		if (!nextAt || key === "null") return;
		const wait = new Date(nextAt).getTime() - Date.now();
		if (wait > MAX_TIMEOUT_MS) return;
		const timer = setTimeout(
			() => queryClient.invalidateQueries({ queryKey: JSON.parse(key) }),
			Math.max(wait, 0),
		);
		return () => clearTimeout(timer);
	}, [nextAt, key, queryClient]);

	if (!now) return null;
	const until = now.until && dayjs(now.until).format("D MMM, HH:mm");
	const fixed: Record<CuratorNow["state"], string | null> = {
		reading: t(
			"checkpoints.now.reading",
			"Your curator is writing the first letter…",
		),
		tasksWanted: null,
		approveWanted: null,
		planReady: t(
			"checkpoints.now.planReady",
			"The plan is ready, so start on it. Tell me how it goes in your devlog posts, and attach the artifacts that show a task is done. In a week I'll look at what's new.",
		),
		sprintReading: t(
			"checkpoints.review.message.sprintReading",
			"The sprint is over. I'm reading the devlog, the new artifacts and the team's pulse now. The review will be here soon — you'll get a letter when it's ready.",
		),
		review: null,
		scopeOpen: null,
		verdictReading: t(
			"checkpoints.now.verdictReading",
			"The last sprint is over. I'm reading everything the team made in these four weeks — the verdict will be here soon.",
		),
		verdict: null,
	};
	const deadline =
		now.state === "approveWanted" && until
			? t(
					"checkpoints.now.approveBy",
					"Approve the plan when you're happy with it — otherwise it approves itself on {date}.",
					{ date: until },
				)
			: now.state === "scopeOpen" && until
				? t(
						"checkpoints.now.changeUntil",
						"You can change the tasks until {date}, then they stay as they are.",
						{ date: until },
					)
				: null;
	const actions: Partial<
		Record<CuratorNow["state"], { action: CuratorNowAction; label: string }>
	> = {
		tasksWanted: {
			action: "tasks",
			label: t("workflow.aside.setTasks", "Set the tasks"),
		},
		approveWanted: {
			action: "tasks",
			label: t("checkpoints.now.reviewPlan", "Review the plan"),
		},
		planReady: {
			action: "plan",
			label: t("checkpoints.review.action.seePlan", "See the plan"),
		},
		review: {
			action: "review",
			label: t("workflow.aside.readReview", "Read the review"),
		},
		scopeOpen: {
			action: "tasks",
			label: t("checkpoints.review.action.reviewTasks", "Review the tasks"),
		},
		verdict: {
			action: "verdict",
			label: t("checkpoints.now.readVerdict", "Read the verdict"),
		},
	};

	return {
		message: now.text ?? fixed[now.state] ?? "",
		deadline,
		...actions[now.state],
	};
};
