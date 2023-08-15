import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { env } from '@/helpers/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await getServerSession(req, res, authOptions)
	const accessToken = Buffer.from(env('BACKEND_KEY')).toString('base64')
	// Check for secret to confirm this is a valid request
	if (req.method !== 'POST' || !req.query.slug) {
		return res.status(401).json({ message: 'Invalid data' })
	}

	if (!session && req.query.secret !== accessToken) {
		return res.status(401).json({ message: 'Invalid token' })
	}

	try {
		// this should be the actual path not a rewritten path
		// e.g. for "/blog/[slug]" this should be "/blog/post-1"
		await res.revalidate(req.query.slug as string)
		return res.json({ revalidated: true })
	} catch (err) {
		// If there was an error, Next.js will continue
		// to show the last successfully generated page
		return res.status(500).send('Error revalidating')
	}
}
