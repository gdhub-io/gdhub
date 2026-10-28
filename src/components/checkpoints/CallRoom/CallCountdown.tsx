"use client";

import { useTranslate } from "@tolgee/react";
import { Statistic } from "antd";
import { useState } from "react";
import { MS_PER_DAY } from "@/lib/checkpoint-days";
import styles from "./style.module.scss";

/** How long until a call starts, ticking: days while there are any, then hours and minutes. */
export function CallCountdown({ at }: { at: string }) {
	const { t } = useTranslate();
	const target = new Date(at).getTime();
	const [days, setDays] = useState(() => target - Date.now() >= MS_PER_DAY);

	return (
		<Statistic.Timer
			type="countdown"
			value={target}
			title={t("checkpoints.call.countdown.title", "Starts in")}
			format={
				days
					? t("checkpoints.call.countdown.days", "D [d] H [h] m [min]")
					: t("checkpoints.call.countdown.hours", "H [h] m [min]")
			}
			onChange={(left) => {
				if (days && Number(left) < MS_PER_DAY) setDays(false);
			}}
			classNames={{
				root: styles.countdown,
				header: styles.countdownTitle,
				content: styles.countdownValue,
			}}
		/>
	);
}
