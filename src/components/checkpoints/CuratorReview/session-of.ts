import type { CheckpointReviewDto } from "@/types/checkpoints";

export const sessionOf = (review: CheckpointReviewDto, index: number) =>
	review.sessions.find((session) => session.index === index);
