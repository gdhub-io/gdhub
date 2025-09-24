import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if ((process.env.NODE_ENV as unknown as string) !== 'test') {
		return res.status(404).json({ error: 'Not found' })
	}

	// Support both GET (for browser navigation from Playwright) and POST
	const method = req.method || 'GET'
	if (method !== 'GET' && method !== 'POST') return res.status(405).end()

	const emailParam =
		method === 'POST' ? (req.body?.email as string | undefined) : (req.query.email as string | undefined)
	const callback = (method === 'POST' ? req.body?.callback : req.query.callback) as string | undefined
	const email = emailParam || `user+${Date.now()}@example.com`

	let user = await prisma.user.findUnique({ where: { email } })
	if (!user) {
		user = await prisma.user.create({
			data: {
				email,
				name: 'E2E User',
				emailVerified: new Date(),
				roles: [prismaClient.UserRole.Guest],
				agreements: {},
				onboardingDone: false,
			},
		})
		await prisma.profile.create({ data: { userId: user.id, name: 'E2E User' } })
	}

	// Create a JWT-compatible session token and set NextAuth cookie
	const secret = process.env.NEXTAUTH_SECRET
	if (!secret) return res.status(500).json({ error: 'NEXTAUTH_SECRET is not set' })

	// Minimal token payload for NextAuth jwt strategy; jwt callback will enrich it on server requests
	const tokenPayload = { email, sub: user.id, id: user.id }
	const token = jwt.sign(tokenPayload, secret, { expiresIn: '30d' })

	const isSecure = Boolean(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.startsWith('https'))
	const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
	const cookie = `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`
	res.setHeader('Set-Cookie', cookie)

	// Ensure jwt callback can run for subsequent requests if needed
	await getServerSession(req as any, res as any, authOptions).catch(() => {})

	if (method === 'GET' && callback) {
		res.statusCode = 302
		res.setHeader('Location', String(callback))
		return res.end()
	}

	return res.status(200).json({ success: true, email, userId: user.id })
}
