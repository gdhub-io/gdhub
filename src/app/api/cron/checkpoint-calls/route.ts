import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { writeDueCallNotes } from "@/repositories/checkpoint-call-notes";
import { approveCheckedPlans } from "@/repositories/checkpoint-plan-edit";
import {
	remindCallsSoon,
	remindPlansUnsent,
	remindScopeClosing,
} from "@/services/checkpoint-notifications";

/**
 * Hourly: the curator and the team hear about a call an hour before it, a
 * call that ended gets its notes from the transcript, and on the AI curator's
 * day 1 a checked plan approves itself and unsent tasks are reminded of, and
 * on day 15 an unconfirmed change to the tasks is reminded of before it closes.
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoint-calls", async () => ({
		reminded: await remindCallsSoon(),
		notes: await writeDueCallNotes(),
		approved: await approveCheckedPlans(),
		remindedOfPlan: await remindPlansUnsent(),
		remindedOfScope: await remindScopeClosing(),
	}));

	return json(result);
});
