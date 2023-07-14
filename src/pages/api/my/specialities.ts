import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await getServerSession(req, res, authOptions)

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		// const response = await AirtableService('Specialities')
		// 	.select({
		// 		filterByFormula: `FIND("${session.user.profileId}", {Profile ID})`,
		// 	})
		// 	.all()

		// if (!response) {
		// 	throw new Error('Error')
		// }

		// const specialities = response.map((item: any) => {
		// 	return {
		// 		id: item.id,
		// 		...item._rawJson.fields,
		// 		Tools: item.get('Tools') ? item.get('Tools').split(`\n`) : [],
		// 	}
		// })

		res.json({})
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
