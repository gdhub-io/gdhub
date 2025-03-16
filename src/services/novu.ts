import { Novu } from '@novu/node'

export type NovuSendArgs = {
	to: { subscriberId: string; email?: string }
	payload: Record<string, any>
	template: string
}

const novuClient = new Novu(process.env.NOVU_API_SECRET as string, {
	backendUrl: (process.env.NOVU_API_URL as string) || 'https://api.novu.co',
})

export class NovuService {
	private constructor() {}

	static async send({ to, payload, template }: NovuSendArgs) {
		try {
			await novuClient.trigger(template, {
				to,
				payload: { app: 'main', ...payload },
			})
		} catch (error) {
			throw error
		}
	}
}
