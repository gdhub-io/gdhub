import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'

function QueueBrokerLog(jobName: string) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value

		descriptor.value = async function (...args: any[]) {
			try {
				// Execute the original method
				const result = await originalMethod.apply(this, args)

				await prisma.queueJobLog.create({
					data: {
						name: jobName,
						status: prismaClient.QueueJobStatus.Completed,
						type: prismaClient.QueueJobType.Broker,
					},
				})

				return result
			} catch (e: any) {
				await prisma.queueJobLog.create({
					data: {
						name: jobName,
						status: prismaClient.QueueJobStatus.Failed,
						type: prismaClient.QueueJobType.Broker,
						log: (e as Error).message,
					},
				})

				return null
			}
		}
	}
}

export default QueueBrokerLog
