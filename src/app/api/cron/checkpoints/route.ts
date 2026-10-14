import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { moveFinishedToReview } from "@/repositories/checkpoint-verdict.repository";
import { remindDevlogsDue } from "@/services/checkpoint-notifications";

/**
 * The checkpoints' daily run: a checkpoint whose 28 days are over waits for
 * its verdict, and an author whose sprint ends today without a devlog is
 * reminded. Pulses and call notes join it here (GDHUB-72).
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoints", async () => ({
		toReview: await moveFinishedToReview(),
		devlogReminders: await remindDevlogsDue(),
	}));

	return json(result);
});
