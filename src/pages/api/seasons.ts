import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await unstable_getServerSession(req, res, authOptions)
	let output: any[] = []

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const seasons = await AirtableService('Seasons')
			.select({ fields: ['Name', 'Season Stages'] })
			.all()

		if (!seasons) {
			return res.json({ seasons: null })
		}

		await Promise.all(
			seasons?.map(async (season: any) => {
				const _output = {
					...season.fields,
					id: season.id,
				}

				const stages = await AirtableService('Season Stages')
					.select({
						sort: [{ field: 'Order', direction: 'asc' }],
						fields: ['Name', 'Started At', 'Finished At', 'Status'],
						filterByFormula: `FIND(RECORD_ID(), "${season.get('Season Stages').join(' ')}")`,
						// filterByFormula: `AND(Status != "Passive", FIND(RECORD_ID(), "${season.get('Season Stages').join(' ')}"))`,
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

				output.push(_output)
			})
		)

		res.json({
			seasons: res.json({
				seasons: output,
			}),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
