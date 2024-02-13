import { env } from '@/helpers/env'
import { tgMessageQueue } from '@/workers/tg-message.worker'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import express from 'express'
import passport from 'passport'
import BasicStrategy from 'passport-http'

const basePath = '/api/services/bullmq/admin'
const handler = express()

const serverAdapter = new ExpressAdapter().setBasePath(basePath)

createBullBoard({
	queues: [new BullMQAdapter(tgMessageQueue)],
	serverAdapter,
})

passport.use(
	new BasicStrategy.BasicStrategy(function (username, password, done) {
		return username == 'admin' && password == env('NEXT_PUBLIC_API_KEY')
			? done(null, { authenticated: true })
			: done('Access denied', { authenticated: false })
	})
)

handler.use(passport.authenticate('basic', { session: false }))
handler.use(basePath, serverAdapter.getRouter())

export default handler
