/**
 * Extends the global dayjs with the plugins the app needs and sets the
 * default locale. This used to live in src/pages/_app.tsx; after the move to
 * the App Router it is called from app/layout.tsx (SSR) and app/providers
 * (client).
 *
 * dayjs.extend is idempotent — calling setupDayjs() again is safe.
 */

import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekday from "dayjs/plugin/weekday";
import "dayjs/locale/en";
import { defaultLocale } from "@/config/locale";

export function setupDayjs(): void {
	dayjs.extend(localizedFormat);
	dayjs.extend(utc);
	dayjs.extend(timezone);
	dayjs.extend(localeData);
	dayjs.extend(relativeTime);
	dayjs.extend(weekday);
	dayjs.locale(defaultLocale);
}
