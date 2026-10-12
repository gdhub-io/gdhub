"use client";

import { useTranslate } from "@tolgee/react";
import { Alert, Button, Card, Segmented, Skeleton } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { AdvisorCallList } from "@/components/advisor/AdvisorCallList";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { useAdvisorCalendar } from "@/hooks/advisor-availability";

type View = "upcoming" | "past";

export function AdvisorCalendarClient() {
	const { t } = useTranslate();
	const [view, setView] = useState<View>("upcoming");
	const { data, isLoading, isError, refetch } = useAdvisorCalendar();

	const timeZone = data?.timeZone ?? dayjs.tz.guess();

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("advisor.calendar.title", "Calendar")}
				subTitle={t(
					"advisor.calendar.subtitle",
					"Every call booked with you, in {timeZone} time.",
					{ timeZone: timeZone.replaceAll("_", " ") },
				)}
				extra={
					<Segmented<View>
						value={view}
						onChange={setView}
						options={[
							{
								value: "upcoming",
								label: t("advisor.calendar.upcoming", "Upcoming"),
							},
							{ value: "past", label: t("advisor.calendar.past", "Past") },
						]}
					/>
				}
			/>

			{isError ? (
				<Alert
					type="error"
					showIcon
					title={t(
						"advisor.calendar.error.load",
						"The calendar could not be loaded.",
					)}
					action={
						<Button size="small" onClick={() => refetch()}>
							{t("advisor.calendar.error.retry", "Try again")}
						</Button>
					}
				/>
			) : isLoading || !data ? (
				<Card variant="borderless">
					<Skeleton active avatar paragraph={{ rows: 3 }} />
				</Card>
			) : (
				<AdvisorCallList
					calls={view === "upcoming" ? data.upcoming : data.past}
					timeZone={timeZone}
					upcoming={view === "upcoming"}
					emptyText={
						view === "upcoming"
							? t("advisor.calendar.empty.upcoming", "No calls booked yet.")
							: t("advisor.calendar.empty.past", "No past calls.")
					}
				/>
			)}
		</div>
	);
}
