import { QueueJobStatus, QueueJobType } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

/**
 * Plain-function equivalent of `@QueueCronLog`. Use from App Router Route
 * Handlers (no decorator support) — wrap your async cron body and the result
 * is persisted to `queueJobLog` exactly like the decorator did.
 */
export async function runWithCronLog<T>(
	jobName: string,
	fn: () => Promise<T>,
): Promise<T | undefined> {
	try {
		const result = await fn();

		await prisma.queueJobLog.create({
			data: {
				name: jobName,
				status: QueueJobStatus.Completed,
				type: QueueJobType.Cron,
				data: (result as any) || null,
			},
		});

		return result;
	} catch (e: any) {
		await prisma.queueJobLog.create({
			data: {
				name: jobName,
				status: QueueJobStatus.Failed,
				type: QueueJobType.Cron,
				log: (e as Error).message,
			},
		});

		return undefined;
	}
}

function QueueCronLog(jobName: string) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			try {
				// Execute the original method
				const result = await originalMethod.apply(this, args);

				await prisma.queueJobLog.create({
					data: {
						name: jobName,
						status: QueueJobStatus.Completed,
						type: QueueJobType.Cron,
						data: result || null,
					},
				});

				return result;
			} catch (e: any) {
				await prisma.queueJobLog.create({
					data: {
						name: jobName,
						status: QueueJobStatus.Failed,
						type: QueueJobType.Cron,
						log: (e as Error).message,
					},
				});

				return;
			}
		};
	};
}

export default QueueCronLog;
