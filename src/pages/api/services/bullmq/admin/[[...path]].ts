import { env } from '@/helpers/env'
import { tgMessageQueue } from '@/workers/tg-message.worker'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import express from 'express'
import passport from 'passport'
import BasicStrategy from 'passport-http'

const basePath = '/api/services/bullmq/admin'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath(basePath)

createBullBoard({
	queues: [new BullMQAdapter(tgMessageQueue)],
	serverAdapter,
})

passport.use(
	new BasicStrategy.BasicStrategy(function (username, password, done) {
		const accessToken = Buffer.from(env('NEXT_PUBLIC_API_KEY')).toString('base64')

		return username == 'admin' && password == accessToken
			? done(null, { authenticated: true })
			: done('Access denied', { authenticated: false })
	})
)

const handler = express().use(
	basePath,
	passport.authenticate('basic', { session: false }),
	(_req, _res, next) => {
		next()
	},
	serverAdapter.getRouter()
)

export default handler
