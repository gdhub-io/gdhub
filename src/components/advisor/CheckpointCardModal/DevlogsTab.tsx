"use client";

import { IconNotebook } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex } from "antd";
import { Section } from "@/components/scout/ProjectCardModal/parts";
import { EmptyState } from "@/components/ui";
import type { AdvisorProjectDto } from "@/types/checkpoints";
import { DevlogCard } from "./DevlogCard";

/**
 * What the team published during these 28 days. A person curating answers on
 * the calls, not in writing — written answers are the AI curator's.
 */
export function DevlogsTab({
	devlogs,
}: {
	devlogs: AdvisorProjectDto["devlogs"];
}) {
	const { t } = useTranslate();

	if (!devlogs.length) {
		return (
			<EmptyState
				icon={IconNotebook}
				description={t(
					"advisor.card.devlogsEmpty",
					"No devlogs in this checkpoint yet. The team writes one a sprint.",
				)}
			/>
		);
	}

	return (
		<Section
			title={t("advisor.card.devlogs", "Devlogs")}
			count={devlogs.length}
			loading={false}
		>
			<Flex vertical gap={12}>
				{devlogs.map((devlog) => (
					<DevlogCard key={devlog.id} {...devlog} />
				))}
			</Flex>
		</Section>
	);
}
