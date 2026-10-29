import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { sweepArtifactChecks } from "@/repositories/project/artifact-check";
import { writeDueVerdictReads } from "@/services/checkpoints/flows/ai-curator";
import { requestPulses } from "@/services/checkpoints/flows/pulse";
import {
	writeDueBriefs,
	writeDueReviews,
} from "@/services/checkpoints/flows/review";
import { moveFinishedToReview } from "@/services/checkpoints/flows/verdict";
import {
	remindDevlogsDue,
	remindEvidenceDue,
	remindVerdictsDue,
} from "@/services/checkpoints/reminders";

/**
 * The checkpoints' daily run: a checkpoint whose 28 days are over waits for
 * its verdict, and an author whose sprint ends today without a devlog is
 * reminded, and the team is asked for its pulse. A verdict due tomorrow is
 * chased, and one a day late goes to the administrators. Three days before the
 * verdict, an author whose tasks still lack evidence is told which. The AI curator writes its
 * reviews after the move, so a finished checkpoint gets its final one today; a
 * human curator gets a brief the night before each call and the AI's read of the
 * verdict on day 29.
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoints", async () => ({
		toReview: await moveFinishedToReview(),
		devlogReminders: await remindDevlogsDue(),
		evidenceReminders: await remindEvidenceDue(),
		verdictReminders: await remindVerdictsDue(),
		pulses: await requestPulses(),
		// Before the reviews, so they read whether the evidence opens.
		artifactChecks: await sweepArtifactChecks(),
		reviews: await writeDueReviews(),
		// The human curator's: tonight's brief for a call within 24 hours, and the
		// AI's read once the verdict is due.
		...(await Promise.all([writeDueBriefs(), writeDueVerdictReads()]).then(
			([briefs, verdictReads]) => ({ briefs, verdictReads }),
		)),
	}));

	return json(result);
});
