import { QueueJobStatus, QueueJobType } from "@gdhub-io/gdhub-prisma";
import type { Job } from "bullmq";
import type { NextRequest } from "next/server";
import { apiError, json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import TelegramService from "@/services/telegram";

async function runWithBrokerLog<T>(
	jobName: string,
	fn: () => Promise<T>,
): Promise<T | null> {
	try {
		const result = await fn();
		await prisma.queueJobLog
			.create({
				data: {
					name: jobName,
					status: QueueJobStatus.Completed,
					type: QueueJobType.Broker,
					data:
						result && typeof result === "object"
							? (result as Record<string, unknown>)
							: undefined,
				},
			})
			.catch((e) =>
				console.error(`[queue:${jobName}] Failed to write success log:`, e),
			);
		return result;
	} catch (e: unknown) {
		console.error(`[queue:${jobName}] Job failed:`, e);
		await prisma.queueJobLog
			.create({
				data: {
					name: jobName,
					status: QueueJobStatus.Failed,
					type: QueueJobType.Broker,
					log: (e as Error).message,
				},
			})
			.catch((logErr) =>
				console.error(`[queue:${jobName}] Failed to write error log:`, logErr),
			);
		return null;
	}
}

export const POST = withAuth({ mode: "api" })(async (req: NextRequest) => {
	const job = (await req.json().catch(() => null)) as Job<
		unknown,
		unknown,
		string
	> | null;
	if (!job) return apiError.badRequest("Invalid JSON body");

	if (!process.env.TELEGRAM_BOT_TOKEN) {
		console.warn("[queue:telegram] TELEGRAM_BOT_TOKEN is not set, skipping");
		return json({ success: true, skipped: true });
	}

	const telegramBot = TelegramService.init();

	if (job.name === "new-project-reports") {
		await runWithBrokerLog("new-project-reports", () =>
			telegramBot.sendNewProjectReports({ inLastDays: 1 }),
		);
	}

	if (job.name === "new-specialities") {
		await runWithBrokerLog("new-specialities", () =>
			telegramBot.sendNewSpecialities({ inLastDays: 1 }),
		);
	}

	if (job.name === "new-vacancies") {
		await runWithBrokerLog("new-vacancies", () =>
			telegramBot.sendNewVacancies({ inLastDays: 1 }),
		);
	}

	return json({ success: true });
});
