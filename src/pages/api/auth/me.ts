import { userVerify } from '@helpers/access'
import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		if (req.method !== 'POST') throw new Error('Forbidden request')

		const { username, email, avatar, id, discordId } = userVerify(req)
		const [airUser] = await AirtableService('Users')
			.select({
				maxRecords: 1,
				filterByFormula: `{Email} = "${email}"`,
			})
			.all()

		res.send({
			id,
			discordId,
			username,
			email,
			avatar: avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}` : null,
			firstName: airUser?.get('First Name') || null,
			lastName: airUser?.get('Last Name') || null,
			country: airUser?.get('Country') || null,
		})
	} catch (error: any) {
		res.status(500).json({ error: error.message })
	}
}
