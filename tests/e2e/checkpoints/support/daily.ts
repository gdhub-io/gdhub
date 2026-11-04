import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";

/**
 * Daily's side of a call on the stand, where Daily is emulated (GDHUB-116): the
 * webhooks it would send, signed with the stand's secret from `dev:test`.
 */
const SECRET = "ZTJlLWRhaWx5LXNlY3JldA==";

/** Posts one Daily webhook to the app, signed as Daily signs it. */
export async function dailyWebhook(
	page: Page,
	type: string,
	payload: Record<string, unknown>,
) {
	const body = JSON.stringify({ type, payload });
	const timestamp = String(Math.floor(Date.now() / 1000));
	const signature = createHmac("sha256", Buffer.from(SECRET, "base64"))
		.update(`${timestamp}.${body}`)
		.digest("base64");
	const response = await page.request.post("/api/daily/webhooks", {
		data: body,
		headers: {
			"content-type": "application/json",
			"x-webhook-timestamp": timestamp,
			"x-webhook-signature": signature,
		},
	});
	expect(response.ok(), await response.text()).toBe(true);
}

/** What the emulated Daily holds for a room: who is in it, its transcript jobs. */
export async function roomState(page: Page, room: string) {
	const response = await page.request.get(`/api/dev/daily?room=${room}`);
	expect(response.ok(), await response.text()).toBe(true);
	return (await response.json()) as {
		open: boolean;
		people: { userId: string }[];
		jobs: string[];
	};
}

/**
 * The call is over: Daily says the meeting ended, its recording is ready, and the
 * transcript job the app started from it has finished.
 */
export async function finishCall(page: Page, room: string) {
	await dailyWebhook(page, "meeting.ended", {
		room,
		end_ts: Math.floor(Date.now() / 1000),
	});
	const made = await page.request.post("/api/dev/daily", {
		data: { action: "recording", room },
	});
	const { recordingId } = (await made.json()) as { recordingId: string };
	await dailyWebhook(page, "recording.ready-to-download", {
		room_name: room,
		recording_id: recordingId,
	});
	const [job] = (await roomState(page, room)).jobs;
	expect(job, "the app started a transcript job").toBeTruthy();
	await dailyWebhook(page, "batch-processor.job-finished", { id: job });
}
