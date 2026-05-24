import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";

const PushTestSchema = z.object({
	pushKey: z.string().min(1),
	roomId: z.string().optional(),
	eventType: z.string().optional(),
	message: z.string().optional(),
});

type PushTestBody = z.infer<typeof PushTestSchema>;

export const POST = withValidation(PushTestSchema)(
	async (_req, _ctx, { body }) => {
		const { pushKey, roomId, eventType, message } = body as PushTestBody;

		const gatewayUrl = process.env.NEXT_PUBLIC_MATRIX_PUSH_GATEWAY_URL;
		const appId = process.env.NEXT_PUBLIC_MATRIX_PUSH_APP_ID;

		if (!gatewayUrl || !appId) {
			return apiError.internal("Matrix push gateway is not configured");
		}

		const eventId = `$dev_${Date.now()}`;
		const payload = {
			notification: {
				event_id: eventId,
				room_id: roomId || "!dev:gdhub",
				type: eventType || "m.room.message",
				sender: "@dev:gdhub",
				content: {
					body: message || "Test push from _dev page",
					msgtype: "m.text",
				},
				devices: [
					{
						app_id: appId,
						pushkey: pushKey,
						data: {},
					},
				],
			},
		};

		const response = await fetch(gatewayUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		const text = await response.text();
		let bodyResult: unknown = null;
		if (text) {
			try {
				bodyResult = JSON.parse(text);
			} catch {
				bodyResult = text;
			}
		}

		return json({
			ok: response.ok,
			status: response.status,
			body: bodyResult,
		});
	},
);
