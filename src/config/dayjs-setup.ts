/**
 * Расширяет глобальный dayjs необходимыми приложению плагинами и
 * выставляет дефолтную локаль. Раньше жило в src/pages/_app.tsx;
 * после перехода на App Router вызывается из app/layout.tsx (SSR)
 * и app/providers (клиент).
 *
 * Вызовы dayjs.extend идемпотентны — повторные setupDayjs() безопасны.
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
