import { createHmac, timingSafeEqual } from "node:crypto";
import { CALL_MAX_PARTICIPANTS } from "@/config/checkpoint";
import { env } from "@/helpers/env";

const API = "https://api.daily.co/v1";

const daily = async <T>(
	path: string,
	init?: { method?: string; body?: unknown },
): Promise<T> => {
	const response = await fetch(`${API}${path}`, {
		method: init?.method ?? "GET",
		headers: {
			Authorization: `Bearer ${env("DAILY_API_KEY")}`,
			"Content-Type": "application/json",
		},
		body: init?.body ? JSON.stringify(init.body) : undefined,
	});
	if (!response.ok) {
		throw new Error(
			`Daily ${init?.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`,
		);
	}
	return response.json() as Promise<T>;
};

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/**
 * The call's room and its URL: a private, audio-recordable room that lives as
 * long as the call's window, made by whoever asks first.
 */
export const callRoom = async (name: string, closesAt: Date) => {
	const existing = await fetch(`${API}/rooms/${name}`, {
		headers: { Authorization: `Bearer ${env("DAILY_API_KEY")}` },
	});
	if (existing.ok) return ((await existing.json()) as { url: string }).url;

	const room = await daily<{ url: string }>("/rooms", {
		method: "POST",
		body: {
			name,
			privacy: "private",
			properties: {
				exp: seconds(closesAt),
				eject_at_room_exp: true,
				max_participants: CALL_MAX_PARTICIPANTS,
				enable_recording: "cloud-audio-only",
			},
		},
	});
	return room.url;
};

/** The curator owns the call and starts its recording by joining. */
export const callToken = async (input: {
	room: string;
	userId: string;
	userName: string;
	curator: boolean;
	closesAt: Date;
}) =>
	(
		await daily<{ token: string }>("/meeting-tokens", {
			method: "POST",
			body: {
				properties: {
					room_name: input.room,
					user_id: input.userId,
					user_name: input.userName,
					is_owner: input.curator,
					exp: seconds(input.closesAt),
					...(input.curator && {
						start_cloud_recording: true,
						start_cloud_recording_opts: { type: "cloud-audio-only" },
					}),
				},
			},
		})
	).token;

/** Ends the call for everyone: a deleted room ejects whoever is in it. */
export const closeCallRoom = (name: string) =>
	daily(`/rooms/${name}`, { method: "DELETE" });

/** Who is in a room right now, by the user id their token carried; none when the room is not up. */
export const roomPresence = async (room: string) => {
	const { data } = await daily<{ data: { userId?: string | null }[] }>(
		`/rooms/${room}/presence`,
	).catch(() => ({ data: [] }));
	return data.flatMap((person) => (person.userId ? [person.userId] : []));
};

/** Who was in a room's meetings, by the user id their token carried, and the minutes they spent. */
export const roomParticipants = async (room: string) => {
	const { data } = await daily<{
		data: { participants: { duration: number; user_id?: string | null }[] }[];
	}>(`/meetings?room=${room}&limit=100`);
	const participants = data.flatMap((meeting) => meeting.participants);
	const total = participants.reduce(
		(sum, participant) => sum + participant.duration,
		0,
	);
	return {
		minutes: Math.round(total / 60),
		userIds: [
			...new Set(
				participants.flatMap((participant) =>
					participant.user_id ? [participant.user_id] : [],
				),
			),
		],
	};
};

export const startTranscriptJob = (recordingId: string) =>
	daily<{ id: string }>("/batch-processor", {
		method: "POST",
		body: {
			preset: "transcript",
			inParams: { sourceType: "recordingId", recordingId },
			outParams: { s3Config: { s3KeyTemplate: "transcript" } },
		},
	});

/** The room a finished job's recording was made in, and the transcript's text. */
export const transcriptOfJob = async (jobId: string) => {
	const job = await daily<{ input: { recordingId?: string } }>(
		`/batch-processor/${jobId}`,
	);
	const recordingId = job.input.recordingId;
	if (!recordingId) return null;

	const [recording, links] = await Promise.all([
		daily<{ room_name: string; start_ts: number }>(
			`/recordings/${recordingId}`,
		),
		daily<{ transcription: { format: string; link: string }[] }>(
			`/batch-processor/${jobId}/access-link`,
		),
	]);
	const link = links.transcription.find((file) => file.format === "txt")?.link;
	if (!link) return null;

	return {
		room: recording.room_name,
		recordingId,
		startedAt: new Date(recording.start_ts * 1000).toISOString(),
		text: await (await fetch(link)).text(),
	};
};

/** Daily signs `timestamp.body` with the base64 secret given at registration. */
export const isDailyWebhook = (
	body: string,
	timestamp: string | null,
	signature: string | null,
) => {
	if (!timestamp || !signature) return false;
	const expected = createHmac(
		"sha256",
		Buffer.from(env<string>("DAILY_WEBHOOK_SECRET"), "base64"),
	)
		.update(`${timestamp}.${body}`)
		.digest();
	const given = Buffer.from(signature, "base64");
	return given.length === expected.length && timingSafeEqual(given, expected);
};
