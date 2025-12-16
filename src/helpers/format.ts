import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { AvailableLocales } from "@/config/locale";

dayjs.extend(localizedFormat);

import type { NextApiRequest } from "next";

export const isValidJSON = (text: any) => {
	if (typeof text !== "string") {
		return false;
	}
	try {
		JSON.parse(text);
		return true;
	} catch (error) {
		return false;
	}
};

export function formatNestedJson(obj: any, parentKey = "", output = "") {
	if (Array.isArray(obj)) {
		obj.forEach((item, index) => {
			const key = `${parentKey}[${index}]`;
			if (
				typeof item === "object" &&
				item !== null &&
				item instanceof Date === false
			) {
				output = formatNestedJson(item, key, output);
			} else {
				if (item instanceof Date) {
					item = item.toISOString();
				}

				output += `${key}: ${item}\n`;
			}
		});
	} else {
		Object.entries(obj).forEach(([key, value]) => {
			const fullKey = parentKey ? `${parentKey}.${key}` : key;

			if (
				typeof value === "object" &&
				value !== null &&
				value instanceof Date === false
			) {
				output = formatNestedJson(value, fullKey, output);
			} else {
				if (value instanceof Date) {
					value = value.toISOString();
				}

				output += `${fullKey}: ${value}\n`;
			}
		});
	}

	return output;
}

export const getServerLocale = (
	req: NextApiRequestWithUser | NextApiRequest,
) => {
	let locale = AvailableLocales.en;

	const acceptLanguage = req.headers["accept-language"];

	if (acceptLanguage) {
		const [availabeLocales] = acceptLanguage.split(";");
		const fullLocale = availabeLocales?.split(",")[1];
		const shortLocale = fullLocale?.split("-")[0];

		// check allowed locales
		if (
			shortLocale &&
			Object.values(AvailableLocales).includes(shortLocale as any)
		) {
			locale = shortLocale as AvailableLocales;
		}
	}

	return locale;
};

/**
 * Format event period for display, localized.
 * @param start ISO string or Date
 * @param end ISO string or Date
 * @param locale string (e.g. 'en', 'ru')
 * @returns {string}
 */
export function formatEventPeriod(
	start: string | Date,
	end: string | Date,
	locale: string = "en",
	format: "day" | "daytime" = "daytime",
): string {
	const dStart = dayjs(start).locale(locale);
	const dEnd = dayjs(end).locale(locale);
	const nowYear = dayjs().year();

	const sameDay = dStart.isSame(dEnd, "day");
	const sameYear = dStart.isSame(dEnd, "year");
	const periodYear = dStart.year();

	const dateFormat = locale === "ru" ? "D MMM" : "MMM D";
	const timeFormat = "HH:mm";
	const yearFormat = "YYYY";

	const showYear = periodYear !== nowYear || dEnd.year() !== nowYear;

	if (format === "day") {
		if (sameDay) {
			// Jan 16, 2025
			return `${dStart.format(dateFormat)}${showYear ? ", " + dStart.format(yearFormat) : ""}`.trim();
		} else if (sameYear && dStart.month() === dEnd.month()) {
			// 10 - 15 Jun, 2025
			const monthLabel = dStart.format(locale === "ru" ? "MMM" : "MMM");
			return `${dStart.format("D")} - ${dEnd.format("D")} ${monthLabel}${showYear ? ", " + dStart.format(yearFormat) : ""}`;
		} else if (sameYear) {
			// Jan 16 - Jan 17, 2025
			return `${dStart.format(dateFormat)} - ${dEnd.format(dateFormat)}${showYear ? ", " + dStart.format(yearFormat) : ""}`;
		} else {
			// Jan 16, 2025 - Jan 17, 2026
			return `${dStart.format(`${dateFormat}${showYear ? ", " + yearFormat : ""}`)} - ${dEnd.format(`${dateFormat}${dEnd.year() !== nowYear ? ", " + yearFormat : ""}`)}`;
		}
	}

	if (sameDay) {
		// Jan 16, 2025 10:00-12:00
		return `${dStart.format(dateFormat)}${showYear ? ", " + dStart.format(yearFormat) : ", "} ${dStart.format(timeFormat)}-${dEnd.format(timeFormat)}`.trim();
	} else if (sameYear) {
		// Jan 16 10:00 - Jan 17 12:00, 2025
		return `${dStart.format(`${dateFormat} ${timeFormat}`)} - ${dEnd.format(`${dateFormat} ${timeFormat}`)}${showYear ? ", " + dStart.format(yearFormat) : ""}`;
	} else {
		// Jan 16, 2025 10:00 - Jan 17, 2026 12:00
		return `${dStart.format(`${dateFormat}${showYear ? ", " + yearFormat : ","} ${timeFormat}`)} - ${dEnd.format(`${dateFormat}, ${dEnd.year() !== nowYear ? yearFormat + " " : ", "}${timeFormat}`)}`;
	}
}

export function formatDollar(amount: number) {
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		notation: "compact",
		compactDisplay: "short",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);

	return formatter;
}
