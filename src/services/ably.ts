import Ably from 'ably'

export class AblyServiceFactory {
	static initRealtime(clientId: string) {
		const realtime = new Ably.Realtime({
			clientId,
			authUrl: '/api/services/ably/token',
		})

		return realtime
	}
}
