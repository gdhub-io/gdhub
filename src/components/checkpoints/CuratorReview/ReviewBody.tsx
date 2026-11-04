"use client";

import { IconCalendarEvent, IconHourglass } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import { AiNote } from "@/components/checkpoints/AiNote";
import { NotesSummary } from "@/components/checkpoints/CallRoom/CallNotes";
import { SprintDirectionView } from "@/components/checkpoints/SprintDirection";
import { EmptyState } from "@/components/ui";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import type { CheckpointReviewDto } from "@/types/checkpoints";
import { sessionOf } from "./session-of";

/** 10.3 / 10.4 when written, 10.2 while on its way. */
export function ReviewBody({
	review,
	index,
}: {
	review: CheckpointReviewDto;
	index: number;
}) {
	const { t } = useTranslate();
	const session = sessionOf(review, index);
	const notes = session?.content?.notes;

	// Sprint 1 has no review: the first is written once it has ended.
	if (index === 1) {
		const first = sessionOf(review, 2)?.scheduledAt;
		return (
			<EmptyState
				size="compact"
				icon={IconCalendarEvent}
				title={t(
					"checkpoints.review.firstSprintTitle",
					"No review in the first sprint",
				)}
				description={t(
					"checkpoints.review.firstSprintText",
					"Sprint 1 is for the work itself. On {date} the AI curator writes the first review, from what the sprint showed: the devlog, the artifacts and the team's pulse.",
					{ date: dayjs(first).format("D MMM") },
				)}
			/>
		);
	}

	if (
		session?.contentStatus !== CheckpointSessionContentStatus.Ready ||
		!notes
	) {
		return (
			<EmptyState
				size="compact"
				icon={IconHourglass}
				title={t(
					"checkpoints.review.pendingTitle",
					"The Sprint {n} review is on its way",
					{ n: index - 1 },
				)}
				description={t(
					"checkpoints.review.pendingText",
					"The AI curator reads the sprint's devlog, artifacts and activity. Ready on the review day — we'll email you.",
				)}
			/>
		);
	}
	return (
		<>
			<NotesSummary
				index={index}
				content={notes}
				plan={review.plan}
				review
				direction={
					notes.direction && (
						<SprintDirectionView
							direction={notes.direction}
							stage={review.stageName}
						/>
					)
				}
			/>
			<AiNote />
		</>
	);
}
