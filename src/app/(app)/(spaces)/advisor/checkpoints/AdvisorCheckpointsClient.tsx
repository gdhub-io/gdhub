"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Typography } from "antd";
import { AdvisorCheckpointCard } from "@/components/advisor/AdvisorCheckpointCard";
import { CheckpointCard } from "@/components/checkpoints/CheckpointCard";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { EmptyState, SectionHeading } from "@/components/ui";
import { useAdvisorCheckpoints } from "@/hooks/checkpoints";
import type { AdvisorCheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

/**
 * The advisor's board — frames `njwBu` and `AHlwo`.
 *
 * Three sections in the order the work reaches them: what is waiting on an
 * answer, what is running, what is done. The first is the only one that owes
 * them a move, so it sits at the top and its cards carry the two buttons.
 */
export function AdvisorCheckpointsClient() {
	const { t } = useTranslate();
	const { data, isPending } = useAdvisorCheckpoints();

	const section = (
		title: string,
		rows: AdvisorCheckpointDto[],
		answerable?: boolean,
	) =>
		rows.length > 0 && (
			<Flex vertical gap={12}>
				<SectionHeading level={4} title={title} />
				{rows.map((row) =>
					// Waiting on an answer, the card is the curator's own: it carries
					// the two buttons and nothing else does. Everything else is the
					// card the author sees, so a checkpoint reads the same on both
					// sides of it.
					answerable ? (
						<AdvisorCheckpointCard key={row.id} checkpoint={row} answerable />
					) : (
						<CheckpointCard
							key={row.id}
							checkpoint={row}
							projectSlug={row.project.slug}
							href={`/advisor/checkpoints/${row.id}`}
						/>
					),
				)}
			</Flex>
		);

	const empty =
		!isPending &&
		!data?.asked.length &&
		!data?.running.length &&
		!data?.closed.length;

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("advisor.checkpoints.title", "Checkpoints")}
				subTitle={t(
					"advisor.checkpoints.subtitle",
					"Checkpoints assigned to you.",
				)}
			/>

			<div className={styles.page}>
				{isPending && <Skeleton active paragraph={{ rows: 6 }} />}

				{empty && (
					<EmptyState
						icon={IconFlag}
						description={t(
							"advisor.checkpoints.empty",
							"Nothing has been handed to you yet. An author picks a curator when they buy a checkpoint.",
						)}
					/>
				)}

				<Flex vertical gap={32}>
					{section(
						t("advisor.checkpoints.asked", "Waiting for your answer"),
						data?.asked ?? [],
						true,
					)}
					{section(
						t("advisor.checkpoints.running", "Under way"),
						data?.running ?? [],
					)}
					{section(
						t("advisor.checkpoints.closed", "Closed"),
						data?.closed ?? [],
					)}
				</Flex>

				{!isPending && !!data?.asked.length && (
					<Typography.Text type="secondary" className={styles.note}>
						{t(
							"advisor.checkpoints.answerNote",
							"An author's money is held until you answer, and released after three days without one.",
						)}
					</Typography.Text>
				)}
			</div>
		</div>
	);
}
