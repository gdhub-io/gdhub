/**
 * Backfill Synapse email notifications for existing Matrix users.
 *
 * Synapse only emails "you have missed messages" to users that have BOTH an
 * email threepid and an email pusher. Users provisioned before the fix in
 * src/services/matrix/admin.ts have neither (user_threepids is empty), so no
 * offline email ever went out. This script walks every Synapse user, looks up
 * the platform email/avatar by localpart (= platform user id) and, when missing:
 *   1. binds the email threepid via PUT /_synapse/admin/v2/users/{id}
 *   2. registers an email pusher via POST /_matrix/client/v3/pushers/set
 *      (token minted for a dedicated "svc_email_pusher" device so live web
 *      sessions are not logged out)
 *   3. sets the profile avatar from User.image — uploaded to the Matrix media
 *      repo first, because avatars only render from mxc:// URIs, not HTTP URLs
 *
 * Usage:
 *   node -r dotenv/config scripts/backfill-matrix-email-notifications.mjs [--dry-run]
 *
 * Required env (same vars the app uses):
 *   MATRIX_CHAT_BASE_URL, MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN,
 *   MATRIX_CHAT_HOMESERVER_DOMAIN, DATABASE_URL
 *
 * Idempotent — safe to re-run; already-configured users are skipped.
 */

import "dotenv/config";
import { GDHubPrismaClient } from "@gdhub-io/gdhub-prisma";

const BASE_URL = process.env.MATRIX_CHAT_BASE_URL;
const ADMIN_TOKEN = process.env.MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN;
const DOMAIN = process.env.MATRIX_CHAT_HOMESERVER_DOMAIN;
const DRY_RUN = process.argv.includes("--dry-run");

if (!BASE_URL || !ADMIN_TOKEN || !DOMAIN) {
	console.error(
		"Missing env. Need MATRIX_CHAT_BASE_URL, MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN, MATRIX_CHAT_HOMESERVER_DOMAIN.",
	);
	process.exit(1);
}

const adminHeaders = {
	"Content-Type": "application/json",
	Authorization: `Bearer ${ADMIN_TOKEN}`,
};

async function adminFetch(path, init) {
	const resp = await fetch(`${BASE_URL}${path}`, {
		headers: adminHeaders,
		...init,
	});
	if (!resp.ok) {
		throw new Error(`${init?.method || "GET"} ${path}: ${resp.status} ${await resp.text()}`);
	}
	return resp.json();
}

async function listSynapseUsers() {
	const users = [];
	let from = 0;
	for (;;) {
		const data = await adminFetch(
			`/_synapse/admin/v2/users?from=${from}&limit=100&guests=false&deactivated=false`,
		);
		users.push(...(data.users || []));
		if (data.next_token === undefined || data.next_token === null) break;
		from = Number(data.next_token);
	}
	return users;
}

async function mintUserToken(userId) {
	const data = await adminFetch(
		`/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
		{
			method: "POST",
			body: JSON.stringify({
				device_id: "svc_email_pusher",
				initial_device_display_name: "Email Notifications",
			}),
		},
	);
	return data.access_token;
}

async function uploadMatrixMedia(imageUrl) {
	if (!/^https?:\/\//.test(imageUrl)) return null;
	const img = await fetch(imageUrl);
	if (!img.ok) return null;
	const resp = await fetch(`${BASE_URL}/_matrix/media/v3/upload?filename=avatar`, {
		method: "POST",
		headers: {
			"Content-Type": img.headers.get("content-type") || "image/png",
			Authorization: `Bearer ${ADMIN_TOKEN}`,
		},
		body: await img.arrayBuffer(),
	});
	if (!resp.ok) {
		throw new Error(`media/upload: ${resp.status} ${await resp.text()}`);
	}
	const data = await resp.json();
	return data.content_uri || null;
}

async function ensureUser(userId, email, imageUrl) {
	const result = { threepid: false, pusher: false, avatar: false };

	const user = await adminFetch(
		`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
	);

	if (email) {
		const normalizedEmail = email.trim().toLowerCase();
		const threepids = user.threepids || [];
		if (
			!threepids.some(
				(t) => t.medium === "email" && t.address.toLowerCase() === normalizedEmail,
			)
		) {
			if (!DRY_RUN) {
				await adminFetch(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
					method: "PUT",
					body: JSON.stringify({
						threepids: [...threepids, { medium: "email", address: normalizedEmail }],
					}),
				});
			}
			result.threepid = true;
		}

		const pushersData = await adminFetch(
			`/_synapse/admin/v1/users/${encodeURIComponent(userId)}/pushers`,
		);
		const hasEmailPusher = (pushersData.pushers || []).some(
			(p) => p.app_id === "m.email" && p.pushkey?.toLowerCase() === normalizedEmail,
		);
		if (!hasEmailPusher) {
			if (!DRY_RUN) {
				const token = await mintUserToken(userId);
				const resp = await fetch(`${BASE_URL}/_matrix/client/v3/pushers/set`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						kind: "email",
						app_id: "m.email",
						pushkey: normalizedEmail,
						app_display_name: "Email Notifications",
						device_display_name: "Email Notifications",
						lang: "en",
						data: {},
						append: false,
					}),
				});
				if (!resp.ok) {
					throw new Error(`pushers/set: ${resp.status} ${await resp.text()}`);
				}
			}
			result.pusher = true;
		}
	}

	// Avatar: only when the user has none (or a useless HTTP one) in Matrix
	if (imageUrl && !(user.avatar_url || "").startsWith("mxc://")) {
		if (!DRY_RUN) {
			const mxc = await uploadMatrixMedia(imageUrl);
			if (mxc) {
				await adminFetch(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
					method: "PUT",
					body: JSON.stringify({ avatar_url: mxc }),
				});
				result.avatar = true;
			}
		} else {
			result.avatar = true;
		}
	}

	return result;
}

const prisma = new GDHubPrismaClient();

try {
	const synapseUsers = await listSynapseUsers();
	console.log(`Synapse users: ${synapseUsers.length}${DRY_RUN ? " (dry run)" : ""}`);

	const localparts = synapseUsers
		.map((u) => /^@(.+):(.+)$/.exec(u.name))
		.filter((m) => m && m[2] === DOMAIN)
		.map((m) => m[1]);

	const platformUsers = await prisma.user.findMany({
		where: { id: { in: localparts } },
		select: { id: true, email: true, image: true },
	});
	const byId = new Map(platformUsers.map((u) => [u.id, u]));

	let boundThreepids = 0;
	let createdPushers = 0;
	let setAvatars = 0;
	let skippedNoEmail = 0;
	let alreadyOk = 0;
	let failures = 0;

	for (const localpart of localparts) {
		const platformUser = byId.get(localpart);
		const email = platformUser?.email;
		const image = platformUser?.image;
		if (!email) skippedNoEmail++;
		if (!email && !image) continue;

		const userId = `@${localpart}:${DOMAIN}`;
		try {
			const { threepid, pusher, avatar } = await ensureUser(userId, email, image);
			if (threepid) boundThreepids++;
			if (pusher) createdPushers++;
			if (avatar) setAvatars++;
			if (!threepid && !pusher && !avatar) alreadyOk++;
			else {
				console.log(
					`  ${DRY_RUN ? "[dry] " : ""}${userId}: threepid=${threepid} pusher=${pusher} avatar=${avatar}`,
				);
			}
		} catch (e) {
			failures++;
			console.error(`  ✗ ${userId}: ${e.message}`);
		}
	}

	console.log(
		`Done. threepids bound: ${boundThreepids}, pushers created: ${createdPushers}, ` +
			`avatars set: ${setAvatars}, already configured: ${alreadyOk}, ` +
			`no platform email: ${skippedNoEmail}, failures: ${failures}`,
	);
	process.exitCode = failures ? 1 : 0;
} finally {
	await prisma.$disconnect().catch(() => {});
}
