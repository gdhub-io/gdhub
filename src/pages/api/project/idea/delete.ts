import { authOptions } from '@/pages/api/auth/[...nextauth]'
import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectIdeaId } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !projectIdeaId) throw new Error('Forbidden request')

		const [project] = await AirtableService('Project Ideas')
			.select({
				fields: ['Slug'],
				maxRecords: 1,
				filterByFormula: `RECORD_ID() = "${projectIdeaId}"`,
			})
			.all()

		await AirtableService('Project Ideas').destroy(projectIdeaId)
		await res.revalidate(`/project/${project.get('Slug')}`)

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
