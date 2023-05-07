import { createProjectReport, updateProjectReport } from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { id, ...data }: any = req.body

	try {
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (!id) {
			const report: any = await createProjectReport(data)

			res.json({ success: true, report })
		} else {
			const report: any = await updateProjectReport(id, data)
			if (!report) {
				throw Error('Updating is wrong')
			}
			res.json({ success: true, report })
		}
	} catch (error: any) {
		console.log('error', id, error)
		res.json({ success: false, error: error.message })
	}
}
