import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { requestPulses } from "@/repositories/checkpoint-pulse";
import { moveFinishedToReview } from "@/repositories/checkpoint-verdict.repository";
import { remindDevlogsDue } from "@/services/checkpoint-notifications";

/**
 * The checkpoints' daily run: a checkpoint whose 28 days are over waits for
 * its verdict, and an author whose sprint ends today without a devlog is
 * reminded, and the team is asked for its pulse. Call notes join it here.
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoints", async () => ({
		toReview: await moveFinishedToReview(),
		devlogReminders: await remindDevlogsDue(),
		pulses: await requestPulses(),
	}));

	return json(result);
});
