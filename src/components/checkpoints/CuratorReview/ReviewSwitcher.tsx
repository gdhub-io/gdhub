"use client";

import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import {
	SessionSwitcher,
	useSprintLabel,
} from "@/components/checkpoints/CallRoom/SessionSwitcher";
import type { CheckpointReviewDto } from "@/types/checkpoints";

/** Start · Sprint 1–3 · Verdict; the ones still ahead are locked. */
export function ReviewSwitcher({
	review,
	selected,
	onSelect,
}: {
	review: CheckpointReviewDto;
	selected: number;
	onSelect: (index: number) => void;
}) {
	const { t } = useTranslate();
	const sprintLabel = useSprintLabel();

	return (
		<SessionSwitcher
			value={selected}
			onChange={onSelect}
			aheadLabel={t(
				"checkpoints.review.option.sprintAhead",
				"This sprint is still ahead",
			)}
			// Session N opens sprint N; the last one is the verdict.
			options={review.sessions.map((session) => {
				return {
					value: session.index,
					label: sprintLabel(
						session.index,
						dayjs(session.scheduledAt).format("D MMM"),
					),
					ahead: session.index > review.current,
				};
			})}
		/>
	);
}
