import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await unstable_getServerSession(req, res, authOptions)

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const response = await AirtableService('Specialities')
			.select({
				filterByFormula: `FIND("${session.user.profileId}", {Profile ID})`,
			})
			.all()

		if (!response) {
			throw new Error('Error')
		}

		const specialities = response.map((item: any) => {
			return {
				id: item.id,
				...item._rawJson.fields,
				Tools: item.get('Tools') ? item.get('Tools').split(`\n`) : [],
			}
		})

		res.json(specialities)
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
