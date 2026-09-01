"use client";

import { IconClock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tooltip } from "antd";
import dayjs from "dayjs";
import {
	META_ICON_STROKE,
	MetaStat,
	type MetaStatSize,
} from "@/components/ui/MetaStat";
import { relativeStamp } from "@/helpers/format";
import styles from "./style.module.scss";

interface PublishedDateProps {
	/** When the content went out. */
	date: string | Date | null | undefined;
	size?: MetaStatSize;
	className?: string;
}

/**
 * When a post went out, read the way a timeline reads it: an age while the post
 * is fresh, the calendar date once it is not, and the exact moment on hover.
 */
export const PublishedDate = ({
	date,
	size = "default",
	className,
}: PublishedDateProps) => {
	const { t } = useTranslate();

	const moment = dayjs(date ?? undefined);
	if (!date || !moment.isValid()) return null;

	const stamp = relativeStamp(moment.toDate());

	const label = (() => {
		switch (stamp.unit) {
			case "now":
				return t("date.relative.now", "now");
			case "seconds":
				return t("date.relative.seconds", "{count}s", { count: stamp.value });
			case "minutes":
				return t("date.relative.minutes", "{count}m", { count: stamp.value });
			case "hours":
				return t("date.relative.hours", "{count}h", { count: stamp.value });
			default:
				// A year only earns its place once the post is not from this one.
				return moment.format(stamp.sameYear ? "MMM D" : "MMM D, YYYY");
		}
	})();

	return (
		<Tooltip title={moment.format("h:mm A · MMM D, YYYY")}>
			{/* antd hands the trigger a ref, which `MetaStat` does not take. */}
			<span className={styles.trigger}>
				<MetaStat
					size={size}
					className={className}
					icon={
						<IconClock
							size="100%"
							stroke={META_ICON_STROKE}
							aria-hidden="true"
						/>
					}
				>
					<time dateTime={moment.toISOString()}>{label}</time>
				</MetaStat>
			</span>
		</Tooltip>
	);
};

export default PublishedDate;
