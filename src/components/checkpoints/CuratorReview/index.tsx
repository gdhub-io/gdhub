import { CallRoom } from "@/components/checkpoints/CallRoom";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { PathTab } from "@/lib/checkpoint-hrefs";
import { AiReview } from "./AiReview";

export type CuratorReviewProps = {
	checkpointId: string;
	index: number;
	backHref: string;
	kind: CheckpointCuratorKind;
	/** The tab a link asked for. */
	tab?: PathTab;
	/** The address named the sprint: it wins over the open plan. */
	pinned?: boolean;
};

/**
 * Curator's Review: one page for both curators. A pro holds calls, so its
 * page is the call room; the AI writes, so its page is the review.
 */
export function CuratorReview({ kind, pinned, ...props }: CuratorReviewProps) {
	return kind === CheckpointCuratorKind.AI ? (
		<AiReview {...props} pinned={pinned} />
	) : (
		<CallRoom {...props} />
	);
}
