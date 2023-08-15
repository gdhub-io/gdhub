import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id, data } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (id) {
			let requestData = data
			requestData.Season = [data.Season]

			if (data.hasOwnProperty('Core Mechanics') && Array.isArray(data['Core Mechanics'])) {
				requestData['Core Mechanics'] = data['Core Mechanics'].join('|')
			}

			const project = await AirtableService('Project Ideas').update(id, requestData)
			if (!project) {
				throw new Error('Error')
			}

			await res.revalidate(`/project/${project.get('Slug')}`)
		} else {
			const [project] = await AirtableService('Project Ideas').create({
				...data,
				Author: [session.user.id],
				Status: 'Registered',
				Season: [data.Season],
				'Core Mechanics': data['Core Mechanics'].join('|'),
			})

			// Add role Author for user with a first created project
			const author = await AirtableService('Accounts').find(session.user.id)
			const roles = author.get('Roles') as string[]

			if (!roles.includes('Author')) {
				await AirtableService('Accounts').update(author.id, {
					Roles: [...roles, 'Author'],
				})
			}

			await res.revalidate(`/project/${project.get('Slug')}`)
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
