import { CallRoom } from "@/components/checkpoints/CallRoom";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { AiReview } from "./AiReview";

export type CuratorReviewProps = {
	checkpointId: string;
	index: number;
	backHref: string;
	kind: CheckpointCuratorKind;
};

/**
 * Curator's Review: one page for both curators. A pro holds calls, so its
 * page is the call room; the AI writes, so its page is the review.
 */
export function CuratorReview({ kind, ...props }: CuratorReviewProps) {
	return kind === CheckpointCuratorKind.AI ? (
		<AiReview {...props} />
	) : (
		<CallRoom {...props} />
	);
}
