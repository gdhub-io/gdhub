import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Body, createHandler, Post } from "next-api-decorators";

class PushTestDto {
	@IsString()
	@IsNotEmpty()
	pushKey!: string;

	@IsString()
	@IsOptional()
	roomId?: string;

	@IsString()
	@IsOptional()
	eventType?: string;

	@IsString()
	@IsOptional()
	message?: string;
}

class DevPushTestHandler {
	@Post()
	async sendTestPush(@Body() body: PushTestDto) {
		const gatewayUrl = process.env.NEXT_PUBLIC_MATRIX_PUSH_GATEWAY_URL;
		const appId = process.env.NEXT_PUBLIC_MATRIX_PUSH_APP_ID;

		if (!gatewayUrl || !appId) {
			throw new Error("Matrix push gateway is not configured");
		}

		const eventId = `$dev_${Date.now()}`;
		const payload = {
			notification: {
				event_id: eventId,
				room_id: body.roomId || "!dev:gdhub",
				type: body.eventType || "m.room.message",
				sender: "@dev:gdhub",
				content: {
					body: body.message || "Test push from _dev page",
					msgtype: "m.text",
				},
				devices: [
					{
						app_id: appId,
						pushkey: body.pushKey,
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

		return {
			ok: response.ok,
			status: response.status,
			body: bodyResult,
		};
	}
}

export default createHandler(DevPushTestHandler);
