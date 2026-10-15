import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { defaultLocale, isAvailableLocale } from "@/config/locale";

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
	let locale = defaultLocale;

	const acceptLanguage = req.headers["accept-language"];

	if (acceptLanguage) {
		const [availabeLocales] = acceptLanguage.split(";");
		const fullLocale = availabeLocales?.split(",")[1];
		const shortLocale = fullLocale?.split("-")[0];

		// check allowed locales
		if (isAvailableLocale(shortLocale)) {
			locale = shortLocale;
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

/**
 * Money as a short label: 1234 → "$1.23K".
 *
 * `currency` because an investor picks theirs, and `fractionDigits` because a
 * rough estimate wants "$58K" where a stated figure wants "$58.40K" — one
 * formatter either way, so two screens cannot spell dollars differently.
 */
export function formatDollar(
	amount: number,
	{ currency = "USD", fractionDigits = 2 } = {},
) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		notation: "compact",
		compactDisplay: "short",
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	}).format(amount);
}

const COMPACT_UNITS = [
	{ threshold: 1e9, divisor: 1e9, suffix: "B" },
	{ threshold: 1e6, divisor: 1e6, suffix: "M" },
	{ threshold: 1e3, divisor: 1e3, suffix: "k" },
];

/**
 * A count as it reads on a badge: 1234 → "1.2k", 2_300_000 → "2.3M".
 *
 * The fraction is truncated rather than rounded — a badge should not show
 * "1k" until the thousandth one has actually landed. The decimal separator
 * follows the locale, so a Russian reader gets "1,2k".
 */
export function formatCompactCount(
	value: number,
	locale: string = defaultLocale,
): string {
	if (!Number.isFinite(value)) return "0";

	const rounded = Math.trunc(value);
	const abs = Math.abs(rounded);
	const unit = COMPACT_UNITS.find((candidate) => abs >= candidate.threshold);
	if (!unit) return String(rounded);

	const scaled = Math.trunc((rounded / unit.divisor) * 10) / 10;
	return `${scaled.toLocaleString(locale, { maximumFractionDigits: 1 })}${unit.suffix}`;
}

/**
 * A count in full, with the locale's grouping: 1234 → "1,234".
 *
 * The compact form belongs on a badge; this one is for a figure the reader is
 * meant to compare or quote exactly.
 */
export function formatCount(
	value: number,
	locale: string = defaultLocale,
): string {
	return new Intl.NumberFormat(locale).format(value);
}

/**
 * How a timestamp should read in a meta row, X-style: a compact age while the
 * post is fresh, then the calendar date. Returns the decision rather than the
 * string so the caller can translate the unit and format the date in its own
 * locale.
 */
export type RelativeStamp =
	| { unit: "now" }
	| { unit: "seconds" | "minutes" | "hours"; value: number }
	| { unit: "date"; sameYear: boolean };

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** Below this a ticking seconds counter is noise, not information. */
const JUST_NOW_MS = 10 * SECOND_MS;

export function relativeStamp(
	date: Date,
	now: Date = new Date(),
): RelativeStamp {
	// A clock skew between the server and the reader can put a fresh post in the
	// future; it is still "now" rather than a negative age.
	const elapsed = Math.max(0, now.getTime() - date.getTime());

	if (elapsed < JUST_NOW_MS) return { unit: "now" };
	if (elapsed < MINUTE_MS)
		return { unit: "seconds", value: Math.floor(elapsed / SECOND_MS) };
	if (elapsed < HOUR_MS)
		return { unit: "minutes", value: Math.floor(elapsed / MINUTE_MS) };
	if (elapsed < DAY_MS)
		return { unit: "hours", value: Math.floor(elapsed / HOUR_MS) };

	return { unit: "date", sameYear: date.getFullYear() === now.getFullYear() };
}

// Offered compensation is entered and displayed in EUR but stored in minor units.
export const toCents = (eur: number) => Math.round(eur * 100);
export const fromCents = (cents: number | null | undefined) =>
	cents != null ? cents / 100 : null;
