import AirtableService from '@/services/airtable'
import dayjs from 'dayjs'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const candidate = await AirtableService('Project Members').find(id)
		const [vacancyName] = candidate.get('Vacancy Name') as string[]

		await AirtableService('Project Members').update(id, {
			Status: 'Member',
			Position: vacancyName || 'Unknown',
			'Started At': dayjs().format('YYYY-MM-DD'),
		})

		res.json({ success: true })
	} catch (error: any) {
		console.log('error', error)
		res.json({ success: false, error: error.message })
	}
}
