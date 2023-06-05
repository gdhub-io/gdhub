import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { specialityId, projectId, vacancyId, contactType, telegramNickname }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !specialityId || !projectId) throw new Error('Forbidden request')

		if (contactType.includes('telegram') && telegramNickname) {
			await AirtableService('Profiles').update(session.user.profileId, {
				'Telegram Nickname': telegramNickname,
			})
		}

		await AirtableService('Project Members').create({
			Member: [session.user.id],
			Project: Array.isArray(projectId) ? projectId : [projectId],
			Vacancy: [vacancyId],
			Speciality: [specialityId],
			Status: 'Intent',
			'Allowed Contacts': contactType,
		})

		res.json({ success: true })
	} catch (error: any) {
		console.log('error', error)
		res.status(502).json({ error: error.message })
	}
}
