import { z } from "zod";
import { VIEW_REPORT_SUBJECTS } from "@/types/admin-views";

/**
 * A calendar day, not an instant. The report buckets in UTC, so anything with a
 * time or a zone in it would only invite the caller to believe otherwise.
 */
const DayString = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
	// "2026-02-31" passes the regex and is not a day. `Date.parse` is no help
	// either — it rolls the overflow forward instead of refusing — so the check
	// is that the date survives a round trip unchanged.
	.refine((value) => {
		const parsed = new Date(`${value}T00:00:00.000Z`);
		return (
			!Number.isNaN(parsed.getTime()) &&
			parsed.toISOString().slice(0, 10) === value
		);
	}, "Not a calendar date");

const RangeShape = {
	from: DayString,
	to: DayString,
};

/** ISO days sort lexicographically, which is the whole reason the format is fixed. */
const ordered = (range: { from: string; to: string }) => range.from <= range.to;

export const ViewsReportQuerySchema = z.object(RangeShape).refine(ordered, {
	message: "`from` must not be after `to`",
	path: ["from"],
});

export type ViewsReportQuery = z.infer<typeof ViewsReportQuerySchema>;

export const ViewsTopQuerySchema = z
	.object({
		type: z.enum(VIEW_REPORT_SUBJECTS),
		...RangeShape,
	})
	.refine(ordered, {
		message: "`from` must not be after `to`",
		path: ["from"],
	});

export type ViewsTopQuery = z.infer<typeof ViewsTopQuerySchema>;
