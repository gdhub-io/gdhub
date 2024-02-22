import { openAI } from '@/services/openai'
import { prisma } from '@/services/prisma'
import { redisConnection } from '@/services/redis'
import { Worker, Queue, Processor } from 'bullmq'

export const matchingSpecAndProjQueue = new Queue('matchingSpecAndProjQueue', {
	connection: { ...redisConnection.options, maxRetriesPerRequest: 1 },
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
	},
})

export const matchingSpecAndProjWorkerRunning = () => {
	const workerHandler: Processor = async (job) => {
		const { specialityId, projectId, specialistText, projectText } = job.data

		const response = await openAI.matchingSpecAndProj(specialistText, projectText)

		await prisma.matchingSpecialistAndProject.upsert({
			where: { projectAndSpecialist: { specialityId, projectId } },
			create: {
				specialityId,
				projectId,
				authorScore: response.authorScore,
				projectScore: response.projectScore,
				teamScore: response.teamScore,
				summary: response.summary,
				avgScore: Math.round((response.authorScore + response.projectScore + response.teamScore) / 3),
			},
			update: {
				authorScore: response.authorScore,
				projectScore: response.projectScore,
				teamScore: response.teamScore,
				summary: response.summary,
				avgScore: Math.round((response.authorScore + response.projectScore + response.teamScore) / 3),
			},
		})
	}

	const worker = new Worker('matchingSpecAndProjQueue', workerHandler, {
		connection: { ...redisConnection.options, maxRetriesPerRequest: null },
		concurrency: 5,
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	})

	worker.on('completed', (job) => {
		console.log(`${job.id} has completed!`)
	})

	worker.on('failed', (job, err) => {
		console.log(`${job?.id} has failed with ${err.message}`)
	})
}
