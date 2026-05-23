import { CronExpressionBuilder } from "natural-cron";
import { json, withAuth } from "@/lib/api-handlers";
import telegramQueue from "@/queues/telegram.queue";

export const POST = withAuth({ mode: "api" })(async () => {
	const schedule = new CronExpressionBuilder();

	await telegramQueue.drain(true);

	await telegramQueue.add(
		"new-project-reports",
		{ app: "main" },
		{
			jobId: "last-project-reports",
			repeat: {
				pattern: schedule
					.atTime(process.env.QUEUE_PROJECT_REPORTS_TIME || "00:00")
					.compile(),
				utc: true,
			},
		},
	);

	await telegramQueue.add(
		"new-specialities",
		{ app: "main" },
		{
			jobId: "last-specialities",
			repeat: {
				pattern: schedule
					.atTime(process.env.QUEUE_SPECIALITIES_TIME || "06:00")
					.compile(),
				utc: true,
			},
		},
	);

	await telegramQueue.add(
		"new-vacancies",
		{ app: "main" },
		{
			jobId: "last-vacancies",
			repeat: {
				pattern: schedule
					.atTime(process.env.QUEUE_VACANCIES_TIME || "12:00")
					.compile(),
				utc: true,
			},
		},
	);

	return json({ success: true });
});
