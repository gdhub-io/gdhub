import { CallRoom } from "@/components/checkpoints/CallRoom";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { PathTab } from "@/lib/checkpoints/hrefs";
import { AiReview } from "./AiReview";

export type CuratorReviewProps = {
	checkpointId: string;
	/** The session the address names. A pro's page always has one: it is the call. */
	index?: number;
	backHref: string;
	kind: CheckpointCuratorKind;
	tab?: PathTab;
};

/**
 * Curator's Review: one page for both curators. A pro holds calls, so its
 * page is the call room; the AI writes, so its page is the review.
 */
export function CuratorReview({ kind, index, ...props }: CuratorReviewProps) {
	return kind === CheckpointCuratorKind.AI ? (
		<AiReview {...props} index={index} />
	) : (
		<CallRoom {...props} index={index ?? 1} />
	);
}
