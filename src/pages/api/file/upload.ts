import { promises as fs } from 'fs'
import { IncomingForm } from 'formidable'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import SanityService from '@/services/sanity'

/* Don't miss that! */
export const config = {
	api: {
		bodyParser: false,
	},
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const fData = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
			const form = new IncomingForm({
				multiples: false,
			})
			form.parse(req, (err, fields, files) => {
				if (err) return reject(err)
				resolve({ fields, files })
			})
		})

		const file = fData.files.file
		const data = await fs.readFile(file.filepath)

		const response = await SanityService.uploadImage(
			fData.fields?.filename || file.newFilename,
			data,
			fData.fields?.tag
		)

		res.status(200).json(response)
	} catch (error: any) {
		console.log('[API ERROR]', error)

		res.status(200).json({ success: false, error: error?.message })
	}
}

export default handler
