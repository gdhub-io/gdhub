import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectId } = req.body

		if (req.method !== 'POST' || !projectId) throw new Error('Forbidden request')

		const project = await AirtableService<any>('Project Ideas').find(projectId)

		if (!project) throw Error('Project dont found')

		const author = await AirtableService('Profiles').find(project.get('Author'))

		let data: any[] = [
			{
				Name: author.get('Name'),
				Position: 'Founder',
				Avatar: author.get('Image Link'),
			},
		]

		const team = await AirtableService('Project Members')
			.select({
				fields: ['Name', 'Position', 'Level', 'Avatar'],
				filterByFormula: `AND(FIND("${projectId}", {Project ID}), Status = "Member")`,
			})
			.all()

		if (team) {
			data = data.concat(team.map((member: any) => member.fields))
		}

		res.json({
			total: data ? data.length : 1,
			data,
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
