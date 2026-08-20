import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { pruneContentViews } from "@/repositories/content-view.repository";

/**
 * How long individual view rows are kept. They exist to deduplicate a viewer
 * within a day and to split feed from page; once that day is long past they are
 * dead weight. The numbers shown on screen are denormalised counters and survive
 * this untouched.
 */
const RETENTION_DAYS = 90;

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("content-views-retention", async () => {
		const deleted = await pruneContentViews(
			dayjs().subtract(RETENTION_DAYS, "day").startOf("day").toDate(),
		);

		return { deleted };
	});

	return json(result ?? { deleted: 0 });
});
