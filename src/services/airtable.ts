import { env } from '@helpers/env'
import Airtable from 'airtable'
import { DateTime } from 'luxon'

const AIRTABLE_API_KEY = env('AIRTABLE_API_KEY')
const AIRTABLE_BASE_ID = env('AIRTABLE_BASE_ID')

const AirtableService = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)

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
		} else {
			await AirtableService('Accounts').update(member.getId(), {
				'Last Visit At': DateTime.now().toISO(),
			})
		}

		const roles = member.get('Roles') as string[]
		const profile = member.get('Profile') as string

		if (!profile) {
			await createProfile({ name, email })
		}

		return {
			id: member.getId(),
			roles: roles ? roles.map((role: string) => role.toLowerCase()) : [],
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

		return { id: profile.getId(), ...profile?.fields }
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
