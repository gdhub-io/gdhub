import { env } from '@/helpers/env'
import { AuthUser } from '@/types/common'
import { verify } from 'jsonwebtoken'
import { NextApiRequest } from 'next'

export const backendVerify = (req: NextApiRequest) => {
	const accessToken = Buffer.from(env('BACKEND_KEY')).toString('base64')

	return req.headers['authorization'] && req.headers['authorization'] === 'Bearer ' + accessToken
}

export const userVerify = (req: NextApiRequest): AuthUser => {
	const { cookies } = req
	const cookieName = env('NEXT_PUBLIC_AUTH_COOKIE_NAME', 'token')
	const jwtSecret = env('JWT_SECRET', 'this is a development value that should be changed in production!!!!!', true)

	if (!cookies[cookieName]) {
		throw new Error('Insufficient data to verify user')
	}

	return verify(cookies[cookieName], jwtSecret) as AuthUser
}
