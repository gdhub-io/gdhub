import { Novu } from '@novu/node'

export type NovuSendArgs = {
	to: { subscriberId: string; email?: string }
	payload: Record<string, any>
	template: string
}

const novuClient = new Novu(process.env.NOVU_API_SECRET as string)

export class NovuService {
	private constructor() {}

	static async send({ to, payload, template }: NovuSendArgs) {
		try {
			const res = await novuClient.trigger(template, {
				to,
				payload,
			})

			console.log({ to, payload, template }, res.status, res.statusText, res.data)
		} catch (error) {
			throw error
		}
	}
}
