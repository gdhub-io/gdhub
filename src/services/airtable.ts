import { env } from '@helpers/env'
import Airtable from 'airtable'
import { DateTime } from 'luxon'

const AIRTABLE_API_KEY = env('AIRTABLE_API_KEY')
const AIRTABLE_BASE_ID = env('AIRTABLE_BASE_ID')

const AirtableService = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)

export default AirtableService

export const isEarlyPeriod = (recruitmentGroup: any) => {
	const earlyStartedAt = DateTime.fromISO(recruitmentGroup.get('Early started at') as string)
	const recruitmentStartedAt = DateTime.fromISO(recruitmentGroup.get('Recruitment started at') as string)
	const recruitmentToNowDiff = recruitmentStartedAt.diffNow().toObject()
	const recruitmentToEralyDiff = earlyStartedAt.diffNow().toObject()

	if (
		recruitmentToNowDiff.milliseconds &&
		recruitmentToEralyDiff.milliseconds &&
		recruitmentToNowDiff.milliseconds > 0 &&
		recruitmentToEralyDiff.milliseconds < 0
	) {
		return true
	}

	return false
}

export const createMember = async ({ email, name, image }: any) => {
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
				Name: name,
				'Image Link': image,
				Roles: ['Guest'],
				Active: true,
			})
		}

		const roles = member.get('Roles') as string[]

		return {
			id: member.getId(),
			roles: roles ? roles.map((role: string) => role.toLowerCase()) : [],
		}
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}
