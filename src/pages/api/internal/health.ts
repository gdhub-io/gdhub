import { prisma } from '@/services/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		const dbResult = await prisma.$isHealthy()

		return res.json(dbResult)
	}
}
