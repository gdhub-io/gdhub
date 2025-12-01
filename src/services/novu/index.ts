import { Novu } from "@novu/api";

export type NovuSendArgs = {
	to: { subscriberId: string; email?: string };
	payload: Record<string, any>;
	template: string;
};

const novuClient = new Novu({
	secretKey: process.env.NOVU_API_SECRET as string,
	serverURL: (process.env.NOVU_API_URL as string) || "https://api.novu.co",
});

export class NovuService {
	private constructor() {}

	static getClient() {
		return novuClient;
	}

	static async updateFcmDeviceTokens(args: {
		subscriberId: string;
		deviceTokens: string[];
		integrationIdentifier?: string;
	}) {
		const { subscriberId, deviceTokens, integrationIdentifier } = args;

		await novuClient.subscribers.credentials.update(
			{
				providerId: "fcm",
				...(integrationIdentifier ? { integrationIdentifier } : {}),
				credentials: {
					deviceTokens,
				},
			},
			subscriberId,
		);
	}

	static async send({ to, payload, template }: NovuSendArgs) {
		await novuClient.trigger({
			workflowId: template,
			to: {
				subscriberId: to.subscriberId,
				email: to.email,
			},
			payload: { app: "main", ...payload },
		});
	}
}
