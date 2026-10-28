"use client";

import { useTranslate } from "@tolgee/react";
import { Statistic } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { MS_PER_DAY } from "@/lib/checkpoint-days";
import styles from "./style.module.scss";

// setTimeout overflows past ~24.8 days; a page left open that long can reload.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const classNames = {
	root: styles.countdown,
	header: styles.countdownTitle,
	content: styles.countdownValue,
};

/** When a call starts: its date while it is a day or more away, then a ticking countdown. */
export function CallCountdown({ at }: { at: string }) {
	const { t } = useTranslate();
	const target = new Date(at).getTime();
	const [soon, setSoon] = useState(() => target - Date.now() < MS_PER_DAY);

	useEffect(() => {
		if (soon) return;
		const wait = target - MS_PER_DAY - Date.now();
		if (wait > MAX_TIMEOUT_MS) return;
		const timer = setTimeout(() => setSoon(true), Math.max(wait, 0));
		return () => clearTimeout(timer);
	}, [soon, target]);

	if (!soon) {
		return (
			<Statistic
				title={t("checkpoints.call.countdown.on", "Starts")}
				value={dayjs(target).format("MMM D HH:mm")}
				classNames={classNames}
			/>
		);
	}
	return (
		<Statistic.Timer
			type="countdown"
			value={target}
			title={t("checkpoints.call.countdown.title", "Starts in")}
			format={t("checkpoints.call.countdown.hours", "H [h] m [min]")}
			classNames={classNames}
		/>
	);
}
