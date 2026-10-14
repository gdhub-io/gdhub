import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { writeDueCallNotes } from "@/repositories/checkpoint-call-notes";
import { remindCallsSoon } from "@/services/checkpoint-notifications";

/**
 * Hourly: the curator and the team hear about a call an hour before it, and a
 * call that ended gets its notes from the transcript.
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoint-calls", async () => ({
		reminded: await remindCallsSoon(),
		notes: await writeDueCallNotes(),
	}));

	return json(result);
});
