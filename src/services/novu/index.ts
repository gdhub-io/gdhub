import { Novu } from "@novu/api";
import { sendLocalMail, sendsLocally } from "./local-mail";

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
		// Before the E2E guard: dev-signin needs that flag, and the point is to
		// see in dev what would have gone out.
		if (sendsLocally()) return sendLocalMail({ to, payload, template });
		if (process.env.E2E_TEST_AUTH === "1") return;

		const trigger = novuClient.trigger({
			workflowId: template,
			to: {
				subscriberId: to.subscriberId,
				email: to.email,
			},
			payload: { app: "main", ...payload },
		});
		const timeout = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("Novu send timeout")), 5_000),
		);
		await Promise.race([trigger, timeout]);
	}
}
