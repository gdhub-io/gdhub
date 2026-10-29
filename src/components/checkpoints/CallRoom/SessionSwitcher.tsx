"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import { FINAL_SESSION } from "@/config/checkpoint";
import styles from "./style.module.scss";

export type SessionOption = { value: number; label: string; ahead: boolean };

/** A session in the switcher: the sprint it opens, the last one the verdict. */
export const useSprintLabel = () => {
	const { t } = useTranslate();
	return (index: number, date: string) =>
		index === FINAL_SESSION
			? t("checkpoints.review.option.verdict", "Verdict · {date}", { date })
			: t("checkpoints.review.option.sprint", "Sprint {n} · {date}", {
					n: index,
					date,
				});
};

/**
 * Frame u2H4n: the session shown and arrows to its neighbours, for a call
 * room and a Curator's Review alike. A session still ahead cannot be opened.
 */
export function SessionSwitcher({
	options,
	value,
	onChange,
	aheadLabel,
}: {
	options: SessionOption[];
	value: number;
	onChange: (value: number) => void;
	/** Why the next one cannot be opened yet. */
	aheadLabel: string;
}) {
	const { t } = useTranslate();
	const at = options.findIndex((option) => option.value === value);
	const previous = options[at - 1];
	const next = options[at + 1];
	const nextAhead = !next || next.ahead;

	return (
		<div className={styles.sessionSwitcher}>
			<Button
				type="text"
				size="small"
				aria-label={t("checkpoints.switcher.previous", "Previous")}
				icon={<IconChevronLeft size={16} />}
				disabled={!previous}
				onClick={() => previous && onChange(previous.value)}
			/>
			<span className={styles.sessionCurrent}>
				<Typography.Text strong className={styles.small}>
					{options[at]?.label}
				</Typography.Text>
			</span>
			<Tooltip title={next?.ahead ? aheadLabel : undefined}>
				<Button
					type="text"
					size="small"
					aria-label={t("checkpoints.switcher.next", "Next")}
					icon={<IconChevronRight size={16} />}
					disabled={nextAhead}
					onClick={() => next && onChange(next.value)}
				/>
			</Tooltip>
		</div>
	);
}
