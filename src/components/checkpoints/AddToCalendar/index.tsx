"use client";

import {
	IconBrandGoogle,
	IconBrandWindows,
	IconDownload,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import type { MenuProps } from "antd";
import {
	type CalendarEvent,
	downloadIcs,
	googleCalendarUrl,
	outlookCalendarUrl,
} from "@/lib/calendar";

/**
 * Frame 12.08.17: one event into whichever calendar the viewer keeps. A page
 * cannot open the system's default calendar app itself; Safari opens the .ics
 * in Apple Calendar, other browsers save it for the app to open.
 */
export const useCalendarMenu = () => {
	const { t } = useTranslate();
	const open = (url: string) => window.open(url, "_blank", "noopener");

	return (event: CalendarEvent, fileName: string): MenuProps["items"] => [
		{
			key: "google",
			icon: <IconBrandGoogle size={16} />,
			label: t("checkpoints.calendar.google", "Google Calendar"),
			onClick: () => open(googleCalendarUrl(event)),
		},
		{
			key: "outlook",
			icon: <IconBrandWindows size={16} />,
			label: t("checkpoints.calendar.outlook", "Outlook"),
			onClick: () => open(outlookCalendarUrl(event)),
		},
		{
			key: "ics",
			icon: <IconDownload size={16} />,
			label: t("checkpoints.calendar.ics", "Apple Calendar or another app"),
			extra: t("checkpoints.calendar.icsNote", ".ics file"),
			onClick: () => downloadIcs([event], fileName),
		},
	];
};
