import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'
import { NovuService } from '@/services/novu'

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

		const project = await AirtableService('Project Ideas').find(projectId)
		const vacancy = await AirtableService('Project Vacancies').find(vacancyId)
		const [authorId] = project.get('Author') as string[]

		const author = await AirtableService('Project Ideas').find(authorId)
		const authorEmail = author.get('Email') as string

		const candidate = await AirtableService('Project Members').create({
			Member: [session.user.id],
			Project: Array.isArray(projectId) ? projectId : [projectId],
			Vacancy: [vacancyId],
			Speciality: [specialityId],
			Status: 'Intent',
			'Allowed Contacts': contactType,
		})
		const [candiudateName] = candidate.get('Name') as string[]

		await NovuService.send({
			template: 'new-candidate-to-project',
			to: {
				subscriberId: authorId,
				email: authorEmail,
			},
			payload: {
				name: candiudateName,
				vacancy: vacancy.get('Name') as string,
				project: project.get('Name') as string,
				url: process.env.NEXT_PUBLIC_APP_URI + '/my/projects/' + projectId,
			},
		})

		console.info('New notification was sent to ' + authorId)

		res.json({ success: true })
	} catch (error: any) {
		console.log('error', error)
		res.status(502).json({ error: error.message })
	}
}
