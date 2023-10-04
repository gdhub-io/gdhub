// import TelegramService from '@/services/telegram'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import AirtableService from '@/services/airtable'
import { SearchEngineService } from '@/services/typesense'
import { prepareAirtableData } from '@/services/typesense/commands/migrate'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { id, profileId, data } = req.body
	const session: any = await getServerSession(req, res, authOptions)
	let speciality: any

	try {
		if (req.method !== 'POST' || !session || !profileId) throw new Error('Forbidden request')

		if (!id) {
			const account = await AirtableService('Accounts').find(session.user.id)
			const profile = await AirtableService('Profiles').find(profileId)
			const specialities = profile.get('Specialities') as any[]

			speciality = await AirtableService('Specialities').create({
				...data,
				Profile: [profileId],
				Tools: data.Tools ? data.Tools.join(`\n`) : '',
			})

			/** Change role for users with specialities */
			if (!specialities) {
				const roles = account.get('Roles') as string[]

				await AirtableService('Accounts').update(account.id, {
					Roles: [...roles, 'Member'],
				})
			}
		} else {
			speciality = await AirtableService('Specialities').update(id, {
				...data,
				Tools: data.Tools ? data.Tools.join(`\n`) : '',
			})

			const searchClient = await SearchEngineService.init()
			await searchClient.deleteSpecialist(speciality.id)
		}

		await indexNewDocumentToTypesense(speciality)

		if (!speciality) {
			throw new Error('Error')
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}

async function indexNewDocumentToTypesense(speciality: any) {
	const searchClient = await SearchEngineService.init()

	const {
		Name,
		Specialization,
		Level,
		Profile,
		Direction,
		Skills,
		Tools,
		Workplaces,
		Schools,
		Country,
		City,
		Created,
	} = speciality.fields

	/** Create document for typense search engine */
	try {
		await searchClient.addSpecialist(
			prepareAirtableData({
				id: speciality.id,
				fields: {
					Name,
					Specialization,
					Level,
					Profile,
					Direction,
					Skills,
					Tools,
					Workplaces,
					Schools,
					Country,
					City,
					Created,
				},
			})
		)
	} catch (error) {
		console.log(`New record for search engine was not save (id=${speciality.id})`, error)
	}
}
