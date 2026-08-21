"use client";

import { useTranslate } from "@tolgee/react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import { CONTENT_VIEW_RETENTION_DAYS } from "@/types/content-views";
import type { ViewsRange } from "./queries";
import styles from "./ViewsRangePicker.module.scss";

/**
 * The oldest day still on record. Inclusive of today, so the longest preset
 * spans exactly the window the server keeps — a preset that asked for one more
 * day than retention would come back clamped every single time.
 */
const earliestDay = () =>
	dayjs()
		.startOf("day")
		.subtract(CONTENT_VIEW_RETENTION_DAYS - 1, "day");

/** A "last N days" window, inclusive of today. */
export const viewsRangePreset = (days: number): ViewsRange => [
	dayjs()
		.startOf("day")
		.subtract(days - 1, "day"),
	dayjs().endOf("day"),
];

type ViewsRangePickerProps = {
	value: ViewsRange | null;
	onChange: (range: ViewsRange) => void;
};

/**
 * The period, and the retention bound expressed in one place.
 *
 * There is no second preset control: the three windows live in the picker's own
 * `presets` column, exactly as the audit log does it. The bound is not silently
 * clamped either — earlier days are disabled and the panel footer says why.
 */
export function ViewsRangePicker({ value, onChange }: ViewsRangePickerProps) {
	const { t } = useTranslate();
	// Both bounds are today's, and `disabledDate` runs once per rendered cell —
	// deriving "today" in there would rebuild it eighty-four times a panel.
	const { earliest, latest } = useMemo(
		() => ({ earliest: earliestDay(), latest: dayjs() }),
		[],
	);

	const presets = useMemo(
		() => [
			{
				label: t("admin.views.range.preset.7d", "Last 7 days"),
				value: viewsRangePreset(7),
			},
			{
				label: t("admin.views.range.preset.30d", "Last 30 days"),
				value: viewsRangePreset(30),
			},
			{
				label: t("admin.views.range.preset.90d", "Last {days} days", {
					days: CONTENT_VIEW_RETENTION_DAYS,
				}),
				value: viewsRangePreset(CONTENT_VIEW_RETENTION_DAYS),
			},
		],
		[t],
	);

	return (
		<div className={styles.control}>
			<DatePicker.RangePicker
				variant="filled"
				allowClear={false}
				value={value}
				presets={presets}
				disabledDate={(current) =>
					current.isBefore(earliest, "day") || current.isAfter(latest, "day")
				}
				renderExtraFooter={() => (
					<span className={styles.footer}>
						{t(
							"admin.views.range.footer",
							"Views older than {days} days are deleted. {date} is the earliest day still on record.",
							{
								days: CONTENT_VIEW_RETENTION_DAYS,
								date: earliest.format("D MMM YYYY"),
							},
						)}
					</span>
				)}
				onChange={(next) => {
					if (next?.[0] && next[1]) onChange([next[0], next[1]]);
				}}
			/>
			<span className={styles.hint}>
				{t(
					"admin.views.range.retentionHint",
					"7 / 30 / {days}-day presets are inside the picker. Raw views are kept for {days} days — earlier dates are disabled.",
					{ days: CONTENT_VIEW_RETENTION_DAYS },
				)}
			</span>
		</div>
	);
}
