import { prisma } from '@/services/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Method not allowed' })
	}

	try {
		const { projectReportId } = req.query

		if (!projectReportId) {
			return res.status(400).json({ message: 'Project report ID is required' })
		}

		const report = await prisma.projectReport.findUnique({
			where: { id: String(projectReportId) },
			include: {
				project: {
					select: {
						name: true,
						coverImage: true,
						slug: true,
						description: true,
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

		if (!report) {
			return res.status(404).json({ message: 'Project report not found' })
		}

		// Transform the data to match the expected format in the frontend
		const post = {
			id: report.id,
			content: report.content,
			coverImage: report.project?.coverImage,
			createdAt: report.publishedAt,
			video: report.video,
			author: report.author
				? {
						name: report.author.name,
						image: report.author.image,
					}
				: undefined,
			project: report.project
				? {
						name: report.project.name,
						slug: report.project.slug,
						description: report.project.description,
						coverImage: report.project.coverImage,
					}
				: undefined,
		}

		return res.status(200).json(post)
	} catch (error) {
		console.error('Error fetching project report:', error)
		return res.status(500).json({ message: 'Internal server error' })
	}
}
