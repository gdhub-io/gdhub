import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { specialityId, projectId, vacancyId }: any = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !specialityId || !projectId) throw new Error('Forbidden request')

		await AirtableService('Project Members').create({
			Member: [session.user.id],
			Project: [projectId],
			Vacancy: [vacancyId],
			Speciality: [specialityId],
			Position: vacancy.get('Name'),
			Status: 'Intent',
		})

		res.json({ success: true })
	} catch (error: any) {
		console.log('error', error)
		res.json({ success: false, error: error.message })
	}
}
