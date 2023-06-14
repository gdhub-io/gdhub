import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectId } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !projectId) throw new Error('Forbidden request')

		const project = await AirtableService('Project Ideas').find(projectId)

		if (!project) {
			throw new Error('Error')
		}

		res.json({ ...project.fields, id: project.id, isAuthor: project.fields.Author == session.user.id })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
