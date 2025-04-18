import { prisma } from '@/services/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Method not allowed' })
	}

	try {
		const reports = await prisma.projectReport.findMany({
			orderBy: {
				publishedAt: 'desc',
			},
			include: {
				project: {
					select: {
						name: true,
						coverImage: true,
						slug: true,
					},
				},
				author: {
					select: {
						name: true,
						image: true,
					},
				},
			},
		})

		return res.status(200).json(reports)
	} catch (error) {
		console.error('Error fetching project reports:', error)
		return res.status(500).json({ message: 'Internal server error' })
	}
}
