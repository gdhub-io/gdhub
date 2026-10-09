import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { moveFinishedToReview } from "@/repositories/checkpoint-verdict.repository";

/**
 * The checkpoints' daily run. Today it does one thing: a checkpoint whose 28
 * days are over waits for its verdict. Pulses, reminders, call notes and the
 * AI verdict join it here (GDHUB-72).
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoints", async () => ({
		toReview: await moveFinishedToReview(),
	}));

	return json(result);
});
