/**
 * Side-effect import that extends dayjs with the plugins the app relies on.
 *
 * Originally lived in src/pages/_app.tsx; that file was removed when the
 * project moved to App Router (see Etap 3 batch 6). The plugins are loaded
 * here so both server (app/layout.tsx) and client modules can `import`
 * this file once and have the global dayjs instance ready.
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

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.extend(relativeTime);
dayjs.extend(weekday);
dayjs.locale(defaultLocale);

export {};
