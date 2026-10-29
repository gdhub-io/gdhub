import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { pruneContentViews } from "@/repositories/content/views";
import { CONTENT_VIEW_RETENTION_DAYS } from "@/types/content-views";

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("content-views-retention", async () => {
		const deleted = await pruneContentViews(
			dayjs()
				.subtract(CONTENT_VIEW_RETENTION_DAYS, "day")
				.startOf("day")
				.toDate(),
		);

		return { deleted };
	});

	return json(result ?? { deleted: 0 });
});
