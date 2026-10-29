import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Daily's REST API as the e2e stand plays it (`DAILY_EMULATED`, GDHUB-116):
 * rooms, meeting tokens, who is in a room, past meetings and the transcript
 * job, held in the server's memory. The browser's fake call object reports
 * joins and leaves through `/api/dev/daily`; the test signs Daily's webhooks.
 */

type Person = { userId: string; userName: string; since: number };
type Room = {
	url: string;
	exp: number;
	deleted: boolean;
	present: Map<string, Person>;
	/** Seconds each user has spent in the room, across joins. */
	spent: Map<string, number>;
};
type Token = { room: string; userId: string; userName: string; owner: boolean };

type State = {
	rooms: Map<string, Room>;
	tokens: Map<string, Token>;
	recordings: Map<string, { room: string; startTs: number }>;
	jobs: Map<string, string>;
};

// One state for the whole server: each route is its own module in development.
const shared = globalThis as { __dailyEmulated?: State };
shared.__dailyEmulated ??= {
	rooms: new Map(),
	tokens: new Map(),
	recordings: new Map(),
	jobs: new Map(),
};
const state = shared.__dailyEmulated;

export const EMULATED_DAILY_URL = "https://emulated.daily.local";
const TRANSCRIPT_LINK = `${EMULATED_DAILY_URL}/transcript.txt`;
const TRANSCRIPT = path.join(
	process.cwd(),
	"tests/e2e/fixtures/call-transcript.txt",
);

class NotFound extends Error {}

const roomOf = (name: string) => {
	const room = state.rooms.get(name);
	if (!room || room.deleted) throw new NotFound(`room ${name}`);
	return room;
};

const leaveRoom = (room: Room, userId: string) => {
	const person = room.present.get(userId);
	if (!person) return;
	room.spent.set(
		userId,
		(room.spent.get(userId) ?? 0) +
			Math.round((Date.now() - person.since) / 1000),
	);
	room.present.delete(userId);
};

/** Answers one request as Daily's API would; a missing thing throws, as a 404 does. */
export const emulatedDaily = (
	pathname: string,
	method: string,
	body?: Record<string, unknown>,
): unknown => {
	const [route, query = ""] = pathname.split("?");
	const parts = route.split("/").filter(Boolean);

	if (parts[0] === "rooms" && parts.length === 1 && method === "POST") {
		const name = body?.name as string;
		const room: Room = {
			url: `${EMULATED_DAILY_URL}/${name}`,
			exp: (body?.properties as { exp: number }).exp,
			deleted: false,
			present: new Map(),
			spent: new Map(),
		};
		state.rooms.set(name, room);
		return { name, url: room.url };
	}
	if (parts[0] === "rooms" && parts.length === 2) {
		const room = roomOf(parts[1]);
		if (method === "DELETE") {
			for (const userId of [...room.present.keys()]) leaveRoom(room, userId);
			room.deleted = true;
			return { deleted: true };
		}
		return { name: parts[1], url: room.url };
	}
	if (parts[0] === "rooms" && parts[2] === "presence") {
		const room = roomOf(parts[1]);
		return {
			data: [...room.present.values()].map(({ userId }) => ({ userId })),
		};
	}
	if (parts[0] === "meeting-tokens" && method === "POST") {
		const props = body?.properties as Record<string, string | boolean>;
		const token = randomUUID();
		state.tokens.set(token, {
			room: String(props.room_name),
			userId: String(props.user_id),
			userName: String(props.user_name),
			owner: Boolean(props.is_owner),
		});
		return { token };
	}
	if (parts[0] === "meetings") {
		const room = state.rooms.get(new URLSearchParams(query).get("room") ?? "");
		if (!room) return { data: [] };
		return {
			data: [
				{
					participants: [...room.spent].map(([userId, duration]) => ({
						user_id: userId,
						duration,
					})),
				},
			],
		};
	}
	if (parts[0] === "recordings" && parts.length === 2) {
		const recording = state.recordings.get(parts[1]);
		if (!recording) throw new NotFound(`recording ${parts[1]}`);
		return { room_name: recording.room, start_ts: recording.startTs };
	}
	if (
		parts[0] === "batch-processor" &&
		parts.length === 1 &&
		method === "POST"
	) {
		const id = randomUUID();
		state.jobs.set(id, (body?.inParams as { recordingId: string }).recordingId);
		return { id };
	}
	if (parts[0] === "batch-processor" && parts.length >= 2) {
		const recordingId = state.jobs.get(parts[1]);
		if (!recordingId) throw new NotFound(`job ${parts[1]}`);
		return parts[2] === "access-link"
			? { transcription: [{ format: "txt", link: TRANSCRIPT_LINK }] }
			: { input: { recordingId } };
	}
	throw new NotFound(`${method} ${pathname}`);
};

export const isNotFound = (error: unknown) => error instanceof NotFound;

/** The transcript a recording turns into on the stand: one fixed call. */
export const emulatedText = (link: string) =>
	link === TRANSCRIPT_LINK ? readFileSync(TRANSCRIPT, "utf8") : null;

/** The fake call object's side: someone came in with a token, or left. */
export const emulatedPresence = (token: string, present: boolean) => {
	const grant = state.tokens.get(token);
	if (!grant) throw new NotFound("token");
	const room = roomOf(grant.room);
	if (present) {
		room.present.set(grant.userId, {
			userId: grant.userId,
			userName: grant.userName,
			since: Date.now(),
		});
	} else {
		leaveRoom(room, grant.userId);
	}
	return grant;
};

/** Who the fake call object sees in its room, or that the room is gone. */
export const emulatedRoom = (name: string) => {
	const room = state.rooms.get(name);
	if (!room || room.deleted) return { open: false, people: [] };
	return {
		open: true,
		people: [...room.present.values()].map(({ userId, userName }) => ({
			userId,
			userName,
			owner: [...state.tokens.values()].some(
				(token) =>
					token.room === name && token.userId === userId && token.owner,
			),
		})),
	};
};

/** A finished recording of a room, as Daily would announce it by webhook. */
export const emulatedRecording = (room: string) => {
	const id = randomUUID();
	state.recordings.set(id, {
		room,
		startTs: Math.floor(Date.now() / 1000) - 600,
	});
	return id;
};
