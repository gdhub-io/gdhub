import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { remindCallsSoon } from "@/services/checkpoint-notifications";

/** Hourly: the curator and the team hear about a call an hour before it. */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoint-calls", async () => ({
		reminded: await remindCallsSoon(),
	}));

	return json(result);
});
