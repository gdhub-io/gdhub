import { prisma } from '@/services/prisma'
import { redisConnectionIsReady } from '@/services/redis'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		const dbResult = await prisma.$isHealthy()
		const redisResult = await redisConnectionIsReady()

		return res.json(dbResult && redisResult)
	}
}
