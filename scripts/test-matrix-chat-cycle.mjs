/**
 * End-to-end smoke test for the admin-initiated Matrix chat cycle.
 *
 * Runs the full loop against a live Synapse server (no app/UI involved):
 *   1. provision two users (initiator + target) via the Synapse Admin API
 *   2. mint access tokens for both
 *   3. initiator creates a direct room and invites the target
 *   4. target syncs and sees the invite (the "appears in chat list" step)
 *   5. inspect target pushers + push rules (the "gets notified" step)
 *   6. target joins, then sends a message
 *   7. initiator syncs, sees the message, and replies
 *   8. target syncs and sees the reply
 *
 * Usage:
 *   node -r dotenv/config scripts/test-matrix-chat-cycle.mjs
 *
 * Required env (same vars the app uses):
 *   MATRIX_CHAT_BASE_URL
 *   MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN
 *   MATRIX_CHAT_HOMESERVER_DOMAIN
 *
 * Each run uses fresh, unique localparts so it is safe to re-run.
 */

import "dotenv/config";

const BASE_URL = process.env.MATRIX_CHAT_BASE_URL;
const ADMIN_TOKEN = process.env.MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN;
const DOMAIN = process.env.MATRIX_CHAT_HOMESERVER_DOMAIN;

if (!BASE_URL || !ADMIN_TOKEN || !DOMAIN) {
	console.error(
		"Missing env. Need MATRIX_CHAT_BASE_URL, MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN, MATRIX_CHAT_HOMESERVER_DOMAIN.",
	);
	process.exit(1);
}

let failures = 0;
const ok = (cond, label) => {
	console.log(`${cond ? "  ✓" : "  ✗"} ${label}`);
	if (!cond) failures++;
};
const step = (n, label) => console.log(`\n[${n}] ${label}`);

async function mx(path, { token, method = "GET", body, admin = false } = {}) {
	const res = await fetch(`${BASE_URL}${path}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${admin ? ADMIN_TOKEN : token}`,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	let data;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = text;
	}
	if (!res.ok) {
		throw new Error(`${method} ${path} → ${res.status} ${text}`);
	}
	return data;
}

async function ensureUser(localpart) {
	const userId = `@${localpart}:${DOMAIN}`;
	await mx(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
		admin: true,
		method: "PUT",
		body: {
			password: `pw_${localpart}`,
			displayname: localpart,
			admin: false,
			deactivated: false,
		},
	});
	return userId;
}

async function login(localpart) {
	const userId = `@${localpart}:${DOMAIN}`;
	const data = await mx(
		`/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
		{
			admin: true,
			method: "POST",
			body: { device_id: `test_${localpart}`, initial_device_display_name: "cycle-test" },
		},
	);
	return { userId, token: data.access_token, deviceId: data.device_id };
}

const sync = (token, since) =>
	mx(`/_matrix/client/v3/sync?timeout=0${since ? `&since=${since}` : ""}`, {
		token,
	});

const sendMessage = (token, roomId, text, txn) =>
	mx(
		`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txn}`,
		{ token, method: "PUT", body: { msgtype: "m.text", body: text } },
	);

async function main() {
	const stamp = `${Date.now()}`;
	const initiatorLp = `cycletest_admin_${stamp}`;
	const targetLp = `cycletest_user_${stamp}`;

	step(1, "Provision users + tokens");
	await ensureUser(initiatorLp);
	await ensureUser(targetLp);
	const initiator = await login(initiatorLp);
	const target = await login(targetLp);
	ok(!!initiator.token && !!target.token, "both users have access tokens");

	step(2, "Initiator creates a direct room and invites the target");
	// mirror the app route: no explicit name → Matrix auto-names the DM from heroes
	const created = await mx(`/_matrix/client/v3/createRoom`, {
		token: initiator.token,
		method: "POST",
		body: {
			is_direct: true,
			invite: [target.userId],
		},
	});
	const roomId = created.room_id;
	ok(!!roomId, `room created: ${roomId}`);

	step(3, "Target syncs → invite shows up (the chat-list step)");
	const targetSync1 = await sync(target.token);
	const inviteRooms = targetSync1.rooms?.invite || {};
	ok(!!inviteRooms[roomId], "invite present in target's sync (rooms.invite)");

	step(4, "Notification surface — pushers + push rules");
	const pushers = await mx(`/_matrix/client/v3/pushers`, { token: target.token });
	const pusherCount = pushers.pushers?.length || 0;
	console.log(
		`  · target has ${pusherCount} pusher(s) registered ${
			pusherCount ? "" : "(none — no offline push until the user opens the app and grants notifications)"
		}`,
	);
	const rules = await mx(`/_matrix/client/v3/pushrules/`, { token: target.token });
	const inviteRule = (rules.global?.override || []).find(
		(r) => r.rule_id === ".m.rule.invite_for_me",
	);
	ok(
		!!inviteRule && inviteRule.enabled !== false,
		"push rule .m.rule.invite_for_me is enabled (invites will push when a pusher exists)",
	);

	step(5, "Target joins the room");
	await mx(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`, {
		token: target.token,
		method: "POST",
	});
	// authoritative membership read (sync is eventually consistent right after join)
	const memberState = await mx(
		`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.member/${encodeURIComponent(target.userId)}`,
		{ token: target.token },
	);
	ok(memberState?.membership === "join", "target's membership is now join");
	const targetSync2 = await sync(target.token);

	step(6, "Target sends a message");
	const msgText = `hello from target ${stamp}`;
	await sendMessage(target.token, roomId, msgText, `m1-${stamp}`);

	step(7, "Initiator syncs → sees target's message, then replies");
	const initSync = await sync(initiator.token);
	const initEvents =
		initSync.rooms?.join?.[roomId]?.timeline?.events?.filter(
			(e) => e.type === "m.room.message",
		) || [];
	ok(
		initEvents.some((e) => e.content?.body === msgText),
		"initiator received the target's message",
	);
	const replyText = `reply from initiator ${stamp}`;
	await sendMessage(initiator.token, roomId, replyText, `m2-${stamp}`);

	step(8, "Target syncs incrementally → sees the reply");
	const targetSync3 = await sync(target.token, targetSync2.next_batch);
	const replyEvents =
		targetSync3.rooms?.join?.[roomId]?.timeline?.events?.filter(
			(e) => e.type === "m.room.message",
		) || [];
	ok(
		replyEvents.some((e) => e.content?.body === replyText),
		"target received the initiator's reply",
	);

	step(9, "DM naming — each side should see the OTHER participant");
	// no explicit shared room name (otherwise one side sees a chat named after itself)
	let hasRoomName = true;
	try {
		await mx(
			`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
			{ token: initiator.token },
		);
	} catch {
		hasRoomName = false; // 404 → no m.room.name, good
	}
	ok(!hasRoomName, "room has no explicit m.room.name (auto-named DM)");

	// matrix-js-sdk computes the DM name/avatar from the OTHER joined member
	// (the same data is returned here). Each side's "other member" must be the
	// counterpart, with a display name so the UI shows a real name (not a raw id).
	const joined = (
		await mx(
			`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`,
			{ token: target.token },
		)
	).joined;
	const otherForInitiator = Object.entries(joined).find(
		([id]) => id !== initiator.userId,
	);
	const otherForTarget = Object.entries(joined).find(
		([id]) => id !== target.userId,
	);
	console.log(`  · initiator sees: ${JSON.stringify(otherForInitiator)}`);
	console.log(`  · target sees:    ${JSON.stringify(otherForTarget)}`);
	ok(
		otherForInitiator?.[0] === target.userId &&
			!!otherForInitiator?.[1]?.display_name,
		"initiator's DM resolves to the target (named)",
	);
	ok(
		otherForTarget?.[0] === initiator.userId &&
			!!otherForTarget?.[1]?.display_name,
		"target's DM resolves to the initiator, not themselves (named)",
	);

	console.log(
		`\n${failures ? `❌ ${failures} check(s) failed` : "✅ full cycle passed"}`,
	);
	console.log(`Room: ${roomId}`);
	console.log(`Users: ${initiator.userId}, ${target.userId}`);
	process.exit(failures ? 1 : 0);
}

main().catch((err) => {
	console.error("\n💥 Cycle test crashed:", err.message);
	process.exit(1);
});
