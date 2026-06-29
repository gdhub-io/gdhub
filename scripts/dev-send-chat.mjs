/**
 * Dev helper to play the "other side" of a Matrix chat against a real,
 * logged-in user — used to manually test the invite → toast → accept → reply
 * loop in the browser.
 *
 * A persistent throwaway sender ("@devchat_sender:<domain>", display name
 * "GDHub Support") is reused across calls.
 *
 * Usage:
 *   # create a DM that invites the given user (matrix id OR platform user id)
 *   node scripts/dev-send-chat.mjs invite <@user:domain | platformUserId>
 *
 *   # send a message into a room as the sender (e.g. to test an incoming reply)
 *   node scripts/dev-send-chat.mjs reply <!roomId:domain> "some text"
 *
 * Requires the same env as the app:
 *   MATRIX_CHAT_BASE_URL, MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN, MATRIX_CHAT_HOMESERVER_DOMAIN
 */

import "dotenv/config";

const BASE_URL = process.env.MATRIX_CHAT_BASE_URL;
const ADMIN_TOKEN = process.env.MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN;
const DOMAIN = process.env.MATRIX_CHAT_HOMESERVER_DOMAIN;

if (!BASE_URL || !ADMIN_TOKEN || !DOMAIN) {
	console.error(
		"Missing env (MATRIX_CHAT_BASE_URL, MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN, MATRIX_CHAT_HOMESERVER_DOMAIN).",
	);
	process.exit(1);
}

const SENDER_LOCALPART = "devchat_sender";
const SENDER_DISPLAYNAME = "GDHub Support";

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
	if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
	return data;
}

async function loginAs(userId) {
	const login = await mx(
		`/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
		{ admin: true, method: "POST", body: { device_id: "devchat_dev" } },
	);
	return { userId, token: login.access_token };
}

async function ensureSender() {
	const userId = `@${SENDER_LOCALPART}:${DOMAIN}`;
	await mx(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
		admin: true,
		method: "PUT",
		body: {
			password: `pw_${SENDER_LOCALPART}`,
			displayname: SENDER_DISPLAYNAME,
			admin: false,
			deactivated: false,
		},
	});
	return loginAs(userId);
}

// create the target's Matrix account only if missing — never clobber an
// existing real user's profile/password
async function ensureExists(userId) {
	try {
		await mx(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
			admin: true,
		});
		return;
	} catch (e) {
		if (!/→ 404/.test(e.message)) throw e;
	}
	await mx(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
		admin: true,
		method: "PUT",
		body: { password: crypto.randomUUID(), admin: false, deactivated: false },
	});
}

function toMatrixId(arg) {
	if (arg.startsWith("@")) return arg;
	return `@${arg}:${DOMAIN}`;
}

async function main() {
	const [cmd, a, b, c] = process.argv.slice(2);
	// optional 3rd/4th arg = platform userId to act AS (else the GDHub Support bot)
	const fromArg = cmd === "invite" ? b : c;
	const sender = fromArg
		? await loginAs(toMatrixId(fromArg))
		: await ensureSender();
	const senderLabel = fromArg ? sender.userId : `"${SENDER_DISPLAYNAME}"`;

	if (cmd === "invite") {
		if (!a)
			throw new Error("usage: invite <target> [fromPlatformUserId]");
		const targetId = toMatrixId(a);
		await ensureExists(targetId);
		const room = await mx(`/_matrix/client/v3/createRoom`, {
			token: sender.token,
			method: "POST",
			body: { is_direct: true, invite: [targetId] },
		});
		console.log(`✅ invited ${targetId}`);
		console.log(`   sender:  ${sender.userId} ${senderLabel}`);
		console.log(`   room:    ${room.room_id}`);
		console.log(
			`\nAfter the user Accepts, send a reply with:\n  node scripts/dev-send-chat.mjs reply ${room.room_id} "hi there"${fromArg ? ` ${fromArg}` : ""}`,
		);
		return;
	}

	if (cmd === "reply") {
		if (!a || !b) throw new Error('usage: reply <!roomId> "text" [fromPlatformUserId]');
		const txn = `dev-${process.pid}-${process.hrtime.bigint()}`;
		await mx(
			`/_matrix/client/v3/rooms/${encodeURIComponent(a)}/send/m.room.message/${txn}`,
			{ token: sender.token, method: "PUT", body: { msgtype: "m.text", body: b } },
		);
		console.log(`✅ sent to ${a} as ${senderLabel}: ${b}`);
		return;
	}

	console.error(
		'Unknown command. Use:\n  invite <target> [fromPlatformUserId]\n  reply <!roomId> "text" [fromPlatformUserId]',
	);
	process.exit(1);
}

main().catch((err) => {
	console.error("💥", err.message);
	process.exit(1);
});
