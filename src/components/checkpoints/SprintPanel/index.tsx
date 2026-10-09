"use client";

import { useTranslate } from "@tolgee/react";
import { Tabs } from "antd";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import type { CheckpointDto } from "@/types/checkpoints";
import { Evidence } from "./Evidence";
import { Review } from "./Review";
import { Room } from "./Room";
import { Signals } from "./Signals";
import { Status } from "./Status";
import styles from "./style.module.scss";

export type SprintTab = "status" | "signals" | "evidence" | "review" | "room";

export type SprintPanelProps = {
	checkpoint: CheckpointDto;
	facts: SprintFacts;
	tab: SprintTab;
	onTab: (tab: SprintTab) => void;
	/** Moving on: the footer of the ask panel opens the next step of the path. */
	onGo: (step: string) => void;
};

/**
 * One sprint, four tabs, the last of them the curator's — frame `Checkpoint — Page · Signals, Evidence, Review`.
 *
 * The counts live on the tabs so no panel below has to restate them, and the
 * sprint's dates are not repeated here at all: they are in the sidebar.
 */
export function SprintPanel({
	checkpoint,
	facts,
	tab,
	onTab,
	onGo,
}: SprintPanelProps) {
	const { t } = useTranslate();

	const label = (text: string, count?: string) => (
		<span className={styles.tab}>
			{text}
			{!!count && <span className={styles.tabCount}>{count}</span>}
		</span>
	);

	// A person's review is what was said on the call, so the call and its notes
	// share a tab; an AI holds no calls and keeps the written review.
	const last =
		checkpoint.curatorKind === CheckpointCuratorKind.Human
			? {
					key: "room",
					label: label(t("checkpoints.sprintTab.room", "Room")),
					children: <Room facts={facts} />,
				}
			: {
					key: "review",
					label: label(t("checkpoints.sprintTab.review", "Review")),
					children: <Review facts={facts} />,
				};

	return (
		<Tabs
			// A link to the other curator's tab opens the sprint, not a blank panel.
			activeKey={
				(tab === "room" || tab === "review") && tab !== last.key
					? "status"
					: tab
			}
			onChange={(key) => onTab(key as SprintTab)}
			items={[
				{
					key: "status",
					label: label(t("checkpoints.sprintTab.status", "Status")),
					children: (
						<Status checkpoint={checkpoint} facts={facts} onGo={onGo} />
					),
				},
				{
					key: "signals",
					label: label(
						t("checkpoints.sprintTab.signals", "Signals"),
						facts.marks.asked
							? `${facts.marks.confirmed}/${facts.marks.asked}`
							: undefined,
					),
					children: <Signals checkpoint={checkpoint} sprint={facts.sprint} />,
				},
				{
					key: "evidence",
					label: label(
						t("checkpoints.sprintTab.evidence", "Evidence"),
						facts.proved.length ? String(facts.proved.length) : undefined,
					),
					children: <Evidence checkpoint={checkpoint} facts={facts} />,
				},
				last,
			]}
		/>
	);
}
