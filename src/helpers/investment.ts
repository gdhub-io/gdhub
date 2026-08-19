import type { useTranslate } from "@tolgee/react";
import { formatDollar } from "@/helpers/format";

type Translate = ReturnType<typeof useTranslate>["t"];

/**
 * A span in the units a person thinks in. Past a year, "29 months" is arithmetic
 * the reader has to do; "2 years 5 months" is the same fact already done.
 */
export const duration = (months: number, t: Translate) => {
	const inMonths = (count: number) =>
		t(
			"scout.games.investment.months",
			"{count, plural, one {# month} other {# months}}",
			{ count },
		);

	if (months < 12) return inMonths(months);

	const years = t(
		"scout.games.investment.years",
		"{count, plural, one {# year} other {# years}}",
		{ count: Math.floor(months / 12) },
	);
	const rest = months % 12;

	return rest ? `${years} ${inMonths(rest)}` : years;
};

/**
 * Money that has actually gone in, totalled per currency rather than added up:
 * an investor picks theirs, so one sum across USD, EUR and XTR would mean
 * nothing.
 */
export const totalPerCurrency = (
	investors: readonly { value: number; currency: string }[],
) => {
	const totals = new Map<string, number>();

	for (const investor of investors) {
		totals.set(
			investor.currency,
			(totals.get(investor.currency) ?? 0) + investor.value,
		);
	}

	return [...totals]
		.filter(([, amount]) => amount > 0)
		.map(([currency, amount]) => ({ currency, amount }));
};

export const money = (value: number, currency?: string) =>
	formatDollar(value, { currency, fractionDigits: 0 });

/** Only what the breakdown reads; the full estimate carries more. */
type EstimateFacts = {
	monthlyBurn: number;
	pace: number;
	monthsToRelease: number | null;
	teamSize: number;
	openPositions: number;
};

/**
 * What the estimate is built from, as label/value pairs — split the way a
 * reader should weigh them: what the platform measured about the team, then
 * what it worked out from that.
 *
 * The games table shows these behind an info icon and the card's Investment tab
 * shows them as a section. One dataset, so one place that names its rows: both
 * quote the same figure to the same scout, and wording that drifts between them
 * is wording that has to be trusted twice.
 */
export const estimateInputRows = (
	estimate: EstimateFacts,
	t: Translate,
): [string, string][] => [
	[
		t("scout.games.investment.team", "Team"),
		t("scout.games.investment.people", "{count} people", {
			count: estimate.teamSize,
		}),
	],
	[
		t("scout.games.investment.open", "Open positions"),
		String(estimate.openPositions),
	],
];

export const estimateOutputRows = (
	estimate: EstimateFacts,
	t: Translate,
): [string, string][] => [
	[
		t("scout.games.investment.pace", "Pace"),
		t("scout.games.investment.paceValue", "{percent}% of full time", {
			percent: Math.round(estimate.pace * 100),
		}),
	],
	[
		t("scout.games.investment.burn", "Team costs per month"),
		money(estimate.monthlyBurn),
	],
	[
		t("scout.games.investment.eta", "Release at this pace"),
		estimate.monthsToRelease === null
			? "—"
			: duration(estimate.monthsToRelease, t),
	],
];
