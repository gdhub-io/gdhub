import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { status }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !status) throw new Error('Forbidden request')

		const lectures = await AirtableService('Lectures')
			.select({
				fields: [
					'Applicants Count',
					'Direction',
					'Listeners Accounts',
					'Registered Accounts',
					'Name',
					'Cost',
					'Registration Count',
					'Requested By',
					'Created',
					'Status',
					'Lecturer Name',
					'Date',
					'Link',
				],
				filterByFormula: `AND(FIND(Status, "${status.join(' ')}"))`,
				sort: [
					{ field: 'Date', direction: 'desc' },
					{ field: 'Listeners Accounts', direction: 'desc' },
				],
			})
			.all()

		const lecturesWithRelevant = lectures.map((lecture) => {
			let isRelevant = false
			let isRegistered = true
			const listeners = lecture.get('Listeners Accounts') as string[]
			const registeredListeners = lecture.get('Registered Accounts') as string[]

			if (listeners && listeners.includes(session.user.id)) {
				isRelevant = true
			}

			if (registeredListeners && registeredListeners.includes(session.user.id)) {
				isRegistered = true
			}

			return {
				...lecture.fields,
				id: lecture.id,
				isRelevant,
				isRegistered,
			}
		})

		const queryResult = await AirtableService('Lectures')
			.select({ fields: [], filterByFormula: `AND({Archived} = FALSE(), FIND(Status, "${status.join(' ')}"))` })
			.all()

		res.json({
			total: queryResult.length,
			data: lecturesWithRelevant,
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
