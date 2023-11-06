import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await getServerSession(req, res, authOptions)
	let output: any[] = []

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const seasons = await AirtableService('Seasons')
			.select({
				fields: [
					'Name',
					'Season Stages',
					'Started At',
					'Slug',
					'Project Ideas',
					'Members',
					'Approved Projects',
					'seoImage',
				],
				sort: [{ field: 'Started At', direction: 'desc' }],
				filterByFormula: 'AND(Status != "Not Active", Name != "Indie")',
			})
			.all()

		if (!seasons) {
			return res.json({ seasons: null })
		}

		for (const season of seasons) {
			const approvedProjectsIds = season.get('Approved Projects') as string[]
			const _output: Record<string, any> = {
				...season.fields,
				id: season.id,
				membersCount: approvedProjectsIds ? approvedProjectsIds.length : 0,
				projectsCount: approvedProjectsIds?.length || 0,
			}

			const stagesList = season.get('Season Stages') as string[]
			const stages = await AirtableService('Season Stages')
				.select({
					sort: [{ field: 'Order', direction: 'asc' }],
					fields: ['Name', 'Started At', 'Finished At', 'Status'],
					filterByFormula: `FIND(RECORD_ID(), "${stagesList.join(' ')}")`,
				})
				.all()

			if (stages) {
				_output['Season Stages'] = stages.map((stage: any) => {
					return {
						...stage.fields,
						id: stage.id,
					}
				})

				const currentStage = stages.find((s: any) => s.get('Status') === 'Active')
				_output.Stage = currentStage?.get('Name')
			}

			const membersIds = season.get('Members') as string[]
			if (membersIds?.length) {
				const members = await AirtableService('Project Members')
					.select({
						fields: [],
						filterByFormula: `AND(FIND(Status, "Member, Fired"), FIND(RECORD_ID(), "${membersIds.join(' ')}"))`,
					})
					.all()

				_output.membersCount = _output.projectsCount + members?.length || 0
			}

			output.push(_output)
		}

		output.sort((a, b) => (a.Stage == 'Planning' ? -1 : 1))

		res.json({
			seasons: output,
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
