"use client";

import { useTranslate } from "@tolgee/react";
import { Tabs } from "antd";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import type { CheckpointDto } from "@/types/checkpoints";
import { Evidence } from "./Evidence";
import { Review } from "./Review";
import { Signals } from "./Signals";
import { Status } from "./Status";
import styles from "./style.module.scss";

export type SprintTab = "status" | "signals" | "evidence" | "review";

export type SprintPanelProps = {
	checkpoint: CheckpointDto;
	facts: SprintFacts;
	tab: SprintTab;
	onTab: (tab: SprintTab) => void;
	/** Moving on: the footer of the ask panel opens the next step of the path. */
	onGo: (step: string) => void;
};

/**
 * One sprint, four tabs — frame `Checkpoint — Page · Signals, Evidence, Review`.
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

	return (
		<Tabs
			activeKey={tab}
			onChange={(key) => onTab(key as SprintTab)}
			items={[
				{
					key: "status",
					label: label(t("checkpoints.tab.status", "Status")),
					children: (
						<Status checkpoint={checkpoint} facts={facts} onGo={onGo} />
					),
				},
				{
					key: "signals",
					label: label(
						t("checkpoints.tab.signals", "Signals"),
						facts.marks.asked
							? `${facts.marks.confirmed}/${facts.marks.asked}`
							: undefined,
					),
					children: <Signals checkpoint={checkpoint} sprint={facts.sprint} />,
				},
				{
					key: "evidence",
					label: label(
						t("checkpoints.tab.evidence", "Evidence"),
						facts.proved.length ? String(facts.proved.length) : undefined,
					),
					children: <Evidence checkpoint={checkpoint} facts={facts} />,
				},
				{
					key: "review",
					label: label(t("checkpoints.tab.review", "Review")),
					children: <Review facts={facts} />,
				},
			]}
		/>
	);
}
