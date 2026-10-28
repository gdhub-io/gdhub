"use client";

import {
	IconBrandApple,
	IconBrandGoogle,
	IconBrandWindows,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";
import {
	type CalendarEvent,
	downloadIcs,
	googleCalendarUrl,
	outlookCalendarUrl,
} from "@/lib/calendar";

const openInNewTab = (url: string) => window.open(url, "_blank", "noopener");

/**
 * Google · Outlook · Apple, the three calendars people keep, as menu items:
 * the subscription (12.08.16) and one event (12.08.17) differ only in where
 * each one leads.
 */
export const useCalendarApps = () => {
	const { t } = useTranslate();

	return (to: {
		google: string;
		outlook: string;
		apple: () => void;
		appleLabel?: string;
		appleNote?: ReactNode;
	}): NonNullable<MenuProps["items"]> => [
		{
			key: "google",
			icon: <IconBrandGoogle size={16} />,
			label: t("checkpoints.calendar.google", "Google Calendar"),
			onClick: () => openInNewTab(to.google),
		},
		{
			key: "outlook",
			icon: <IconBrandWindows size={16} />,
			label: t("checkpoints.calendar.outlook", "Outlook"),
			onClick: () => openInNewTab(to.outlook),
		},
		{
			key: "apple",
			icon: <IconBrandApple size={16} />,
			label: to.appleLabel ?? t("checkpoints.calendar.apple", "Apple Calendar"),
			extra: to.appleNote,
			onClick: to.apple,
		},
	];
};

/**
 * Frame 12.08.17: one event into whichever calendar the viewer keeps. A page
 * cannot open the system's default calendar app itself; Safari opens the .ics
 * in Apple Calendar, other browsers save it for the app to open.
 */
export const useCalendarMenu = () => {
	const { t } = useTranslate();
	const apps = useCalendarApps();

	return (event: CalendarEvent, fileName: string) =>
		apps({
			google: googleCalendarUrl(event),
			outlook: outlookCalendarUrl(event),
			apple: () => downloadIcs([event], fileName),
			appleLabel: t(
				"checkpoints.calendar.ics",
				"Apple Calendar or another app",
			),
			appleNote: t("checkpoints.calendar.icsNote", ".ics file"),
		});
};
