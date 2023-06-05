import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const session: any = await getServerSession(req, res, authOptions)
		let projects: any[] = []

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const myMembers = await AirtableService('Project Members')
			.select({
				fields: ['Project'],
				filterByFormula: `Member = "${session.user.email}"`,
			})
			.all()

		let myProjectsList = myMembers.map((m: any) => m.fields.Project[0])
		myProjectsList = [...new Set(myProjectsList)]

		if (myProjectsList.length > 0) {
			const projectsAsMember = await AirtableService('Project Ideas')
				.select({
					filterByFormula: `FIND(RECORD_ID(), "${myProjectsList.join(' ')}")`,
				})
				.all()

			if (projectsAsMember) {
				projects = [...projectsAsMember]
			}
		}

		const projectsAsAuthor = await AirtableService('Project Ideas')
			.select({
				filterByFormula: `FIND("${session.user.email}", Author)`,
			})
			.all()

		if (projectsAsAuthor) {
			projects = [...projects, ...projectsAsAuthor]
		}

		const queryResult = await AirtableService('Project Ideas').select({ fields: [] }).all()

		if (!projects) {
			throw new Error('Error')
		}

		res.json({
			total: queryResult.length,
			data: projects.map((project: any) => ({
				id: project.id,
				isAuthor: project.Author == session.user.id,
				...project.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
