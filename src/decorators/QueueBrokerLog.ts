import { QueueJobStatus, QueueJobType } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

function QueueBrokerLog(jobName: string) {
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
						type: QueueJobType.Broker,
						data: result && typeof result === "object" ? result : null,
					},
				});

				return result;
			} catch (e: any) {
				await prisma.queueJobLog.create({
					data: {
						name: jobName,
						status: QueueJobStatus.Failed,
						type: QueueJobType.Broker,
						log: (e as Error).message,
					},
				});

				return null;
			}
		};
	};
}

export default QueueBrokerLog;
