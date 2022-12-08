import Airtable from 'airtable'
import { DateTime } from 'luxon'

const AirtableService = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
	process.env.AIRTABLE_BASE_ID as string
)

export default AirtableService

export const findOrCreateMember = async ({ email, name, image }: any) => {
	try {
		let [member] = await AirtableService('Accounts')
			.select({
				filterByFormula: `Email = "${email}"`,
				maxRecords: 1,
			})
			.all()

		if (!member) {
			member = await AirtableService('Accounts').create({
				Email: email,
				'Image Link': image,
				Roles: ['Guest'],
				Active: true,
				'Created At': DateTime.now().toISO(),
			})
		}

		const roles = member.get('Roles') as string[]
		const profileId = member.get('Profile') as any
		let profile: any

		if (!profileId) {
			profile = await createProfile({ name, accountId: member.getId() })
		} else {
			profile = await getProfile(email)
		}

		return {
			id: member.getId(),
			roles: roles ? roles.map((role: string) => role.toLowerCase()) : [],
			name: profile.Name as string,
			profileId: profileId ? profileId[0] : null,
		}
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getProfile = async (email: string) => {
	try {
		const [profile] = await AirtableService('Profiles')
			.select({
				filterByFormula: `FIND("${email}", Account)`,
			})
			.all()

		const timeForWork = profile.get('Time For Work') as string

		return { id: profile.getId(), ...profile.fields, 'Time For Work': timeForWork ? timeForWork.split('-') : null }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const createProfile = async ({ name, accountId }: any) => {
	try {
		const newProfile = await AirtableService('Profiles').create({
			Account: [accountId],
			Name: name,
		})

		return newProfile?.fields
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const updateProfile = async (profileId: string, data: any) => {
	try {
		await AirtableService('Profiles').update(profileId, data)

		return true
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getDocumentationVideos = async () => {
	try {
		const videos = await AirtableService('Documentation').select().all()

		return videos.map((i) => {
			if (i.fields.hasOwnProperty('Preview')) {
				const Preview = i.fields.Preview as any[]
				return { ...i.fields, Preview: Preview[0] }
			} else {
				return i.fields
			}
		})
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}
