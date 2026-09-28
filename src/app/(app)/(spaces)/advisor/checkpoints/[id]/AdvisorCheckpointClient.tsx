"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Skeleton } from "antd";
import { useState } from "react";
import { CheckpointCardModal } from "@/components/advisor/CheckpointCardModal";
import { CheckpointDetail } from "@/components/checkpoints/CheckpointDetail";
import { useCheckpointHero } from "@/components/checkpoints/hero";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { EmptyState } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useAdvisorCheckpoint } from "@/hooks/checkpoints";

/**
 * The curator's side of a checkpoint: the same page the author reads.
 *
 * One page for both of them on purpose — the path, the sprints and the evidence
 * are the thing they are talking about, and a second screen describing it in
 * other words would start disagreeing with this one. What differs is what can be
 * pressed, which `viewer` decides.
 */
export function AdvisorCheckpointClient({ id }: { id: string }) {
	const { t } = useTranslate();
	const { data: checkpoint, isPending, isError } = useAdvisorCheckpoint(id);
	const hero = useCheckpointHero(checkpoint);
	const [briefOpen, setBriefOpen] = useState(false);

	if (isPending) return <Skeleton active paragraph={{ rows: 8 }} />;

	if (isError || !checkpoint) {
		return (
			<EmptyState
				icon={IconFlag}
				description={t(
					"advisor.checkpoints.missing",
					"This checkpoint is not one of yours.",
				)}
			/>
		);
	}

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={checkpoint.project.name}
				subTitle={hero.description}
				extra={
					<Flex gap={8} align="center">
						<Button onClick={() => setBriefOpen(true)}>
							{t("advisor.brief.open", "Details")}
						</Button>
						{hero.actions}
					</Flex>
				}
			/>
			<CheckpointDetail checkpoint={checkpoint} viewer="curator" />
			<CheckpointCardModal
				checkpoint={checkpoint}
				open={briefOpen}
				onClose={() => setBriefOpen(false)}
				answerable={checkpoint.status === CheckpointStatus.AwaitingCurator}
			/>
		</div>
	);
}
