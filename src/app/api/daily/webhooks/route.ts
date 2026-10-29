import { type NextRequest, NextResponse } from "next/server";
import {
	recordMeetingEnded,
	saveTranscript,
	transcribeRecording,
} from "@/services/checkpoints/flows/call";
import { isDailyWebhook } from "@/services/daily";

type DailyEvent = { type?: string; payload?: Record<string, never> };

/** Checkpoint calls: when they end, their recordings, their transcripts. */
export async function POST(req: NextRequest) {
	const body = await req.text();
	const signed = isDailyWebhook(
		body,
		req.headers.get("x-webhook-timestamp"),
		req.headers.get("x-webhook-signature"),
	);
	if (!signed) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	const { type, payload = {} } = JSON.parse(body || "{}") as DailyEvent;
	switch (type) {
		case "meeting.ended":
			await recordMeetingEnded(payload.room, new Date(payload.end_ts * 1000));
			break;
		case "recording.ready-to-download":
			await transcribeRecording(payload.room_name, payload.recording_id);
			break;
		case "batch-processor.job-finished":
			await saveTranscript(payload.id);
			break;
	}

	return NextResponse.json({ received: true });
}
