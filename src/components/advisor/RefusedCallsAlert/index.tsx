"use client";

import { useTranslate } from "@tolgee/react";
import { Alert, Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import type { BookedCall } from "@/repositories/advisor/availability";
import styles from "./style.module.scss";

export type RefusedCallsAlertProps = {
	calls: BookedCall[];
	/** The zone the advisor is setting their hours in. */
	timeZone: string;
};

/** Why a save was refused: the booked checkpoint calls the new hours leave out. */
export function RefusedCallsAlert({ calls, timeZone }: RefusedCallsAlertProps) {
	const { t } = useTranslate();

	return (
		<Alert
			type="error"
			showIcon
			title={t(
				"advisor.availability.refused.title",
				"{count, plural, one {# checkpoint call falls} other {# checkpoint calls fall}} outside these hours",
				{ count: calls.length },
			)}
			description={
				<Flex vertical gap={8}>
					<Typography.Text>
						{t(
							"advisor.availability.refused.text",
							"A checkpoint's calls are agreed with the team and don't move with your hours. Move each one with the author first, then you can save.",
						)}
					</Typography.Text>
					{/* ui-guard-ignore antd List is deprecated in v6 and this is a plain bullet list */}
					<ul className={styles.calls}>
						{calls.map((call) => (
							// ui-guard-ignore a bullet of the plain list above
							<li key={call.sessionId}>
								{dayjs(call.scheduledAt)
									.tz(timeZone)
									.format("ddd D MMM · HH:mm")}
								{" · "}
								{t(
									"advisor.availability.refused.call",
									"Call {index} · {project}",
									{
										index: call.index,
										project: call.projectName,
									},
								)}
							</li>
						))}
					</ul>
					<Link href="/advisor/calendar">
						{t(
							"advisor.availability.refused.calendar",
							"Move them in the Calendar",
						)}
					</Link>
				</Flex>
			}
		/>
	);
}

export default RefusedCallsAlert;
