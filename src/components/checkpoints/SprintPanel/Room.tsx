"use client";

import { IconVideo } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex } from "antd";
import { EmptyState } from "@/components/ui/EmptyState";
import { Review, type ReviewProps } from "./Review";

/**
 * The sprint's last tab when a person curates: the call, and under it what was
 * said on it. The call is still to come, so for now it is a placeholder above
 * the notes.
 */
export function Room({ facts, checkpointId, writable }: ReviewProps) {
	const { t } = useTranslate();

	return (
		<Flex vertical gap={16}>
			<EmptyState
				icon={IconVideo}
				title={t("checkpoints.room.planned.title", "The room is on its way")}
				description={t(
					"checkpoints.room.planned.description",
					"Video calls with your curator are planned and will open here. After a call, what was discussed is written up below.",
				)}
			/>
			{/* Left out when empty: Review's own empty state is the AI curator's. */}
			{(!!facts.review || !!facts.scopeNote || writable) && (
				<Review facts={facts} checkpointId={checkpointId} writable={writable} />
			)}
		</Flex>
	);
}
