"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { AdvisorCheckpointCard } from "@/components/advisor/AdvisorCheckpointCard";
import { VerdictModal } from "@/components/advisor/VerdictModal";
import { CheckpointCard } from "@/components/checkpoints/CheckpointCard";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import {
	EmptyState,
	LoadError,
	SectionHeading,
	StatusDot,
} from "@/components/ui";
import { formatShort } from "@/components/WorkflowPath/dates";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useAdvisorCheckpoints } from "@/hooks/checkpoints";
import { useTakeSearchParam } from "@/hooks/useTakeSearchParam";
import {
	verdictDraftOpensAt,
	verdictDueBy,
	verdictOverdue,
} from "@/lib/checkpoints/verdict-window";
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
	const { data, isPending, isLoadingError, refetch } = useAdvisorCheckpoints();
	const [verdictId, setVerdictId] = useState<string | null>(null);

	// The curator's notification links here with `?verdict=<id>`.
	const linked = useTakeSearchParam("verdict");
	useEffect(() => {
		if (linked) setVerdictId(linked);
	}, [linked]);

	const verdictFor = data?.running.find((row) => row.id === verdictId);

	const verdictAction = (row: AdvisorCheckpointDto) => {
		const review = row.status === CheckpointStatus.Review;
		const drafting =
			row.status === CheckpointStatus.Active &&
			!!row.startedAt &&
			new Date() >= verdictDraftOpensAt(row.startedAt);
		if (!review && !drafting) return null;

		const overdue = !!row.dueAt && verdictOverdue(row.dueAt);

		return (
			<>
				{review && !!row.dueAt && (
					<StatusDot
						tone={overdue ? "warning" : "neutral"}
						label={
							overdue
								? t("advisor.verdict.overdue", "Verdict overdue")
								: t("advisor.verdict.dueBy", "Verdict due by {date}", {
										date: formatShort(verdictDueBy(row.dueAt).toISOString()),
									})
						}
					/>
				)}
				<Button
					type={review ? "primary" : "default"}
					onClick={() => setVerdictId(row.id)}
				>
					{review
						? t("advisor.verdict.write", "Write the verdict")
						: t("advisor.verdict.draft", "Draft the verdict")}
				</Button>
			</>
		);
	};

	const section = (
		title: string,
		rows: AdvisorCheckpointDto[],
		{ answerable = false, withVerdict = false } = {},
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
							projectName={row.project.name}
							viewer="curator"
							href={`/advisor/checkpoints/${row.id}`}
							action={withVerdict ? verdictAction(row) : undefined}
						/>
					),
				)}
			</Flex>
		);

	const failed = isLoadingError;
	const empty =
		!isPending &&
		!failed &&
		!data?.asked.length &&
		!data?.running.length &&
		!data?.closed.length &&
		!data?.declined.length;

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

				{failed && (
					<LoadError
						title={t(
							"advisor.checkpoints.load-error",
							"Your checkpoints could not be loaded",
						)}
						onRetry={refetch}
					/>
				)}

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
						{ answerable: true },
					)}
					{section(
						t("advisor.checkpoints.running", "Under way"),
						data?.running ?? [],
						{ withVerdict: true },
					)}
					{section(
						t("advisor.checkpoints.closed", "Closed"),
						data?.closed ?? [],
					)}
					{section(
						t("advisor.checkpoints.declined", "You could not take these"),
						data?.declined ?? [],
					)}
				</Flex>

				{!isPending && !!data?.asked.length && (
					<Typography.Text type="secondary" className={styles.note}>
						{t(
							"advisor.checkpoints.answerWindow",
							"You have three days to answer.",
						)}
					</Typography.Text>
				)}
			</div>

			{verdictFor && (
				<VerdictModal
					checkpoint={verdictFor}
					onClose={() => setVerdictId(null)}
				/>
			)}
		</div>
	);
}
