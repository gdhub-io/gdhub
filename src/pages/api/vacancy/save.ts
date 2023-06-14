import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id, data }: any = req.body
		let vacancy: any
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (!id) {
			vacancy = await AirtableService('Project Vacancies').create(data)
		} else {
			vacancy = await AirtableService('Project Vacancies').update(id, {
				...data,
				'Closed At': null,
			})
		}

		res.json({
			success: true,
			vacancy: {
				...vacancy.fields,
				id: vacancy.id,
			},
		})
	} catch (error: any) {
		console.log('error', error)
		res.json({ success: false, error: error.message })
	}
}
