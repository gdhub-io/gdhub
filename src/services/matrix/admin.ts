import { env } from "@/helpers/env";

export async function ensureMatrixUser(
	localpart: string,
	email?: string,
	displayname?: string,
	avatarUrl?: string,
) {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");

	const userId = `@${localpart}:${DOMAIN}`;

	// Check if user exists via Synapse Admin API
	try {
		const getResp = await fetch(
			`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${ADMIN_TOKEN}`,
				},
			},
		);

		if (getResp.ok) {
			const existing = (await getResp.json()) as {
				avatar_url?: string;
				threepids?: SynapseThreepid[];
			};

			const updatingData: Record<string, unknown> = {};
			if (displayname) updatingData.displayname = displayname;
			// Profile avatars must be mxc:// media URIs — an HTTP URL is stored
			// but never rendered by clients. Upload once; keep an existing mxc one.
			if (avatarUrl && !existing.avatar_url?.startsWith("mxc://")) {
				const mxc = await uploadMatrixMedia(avatarUrl).catch(() => null);
				if (mxc) updatingData.avatar_url = mxc;
			}

			if (Object.keys(updatingData).length > 0) {
				await fetch(
					`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${ADMIN_TOKEN}`,
						},
						body: JSON.stringify(updatingData),
					},
				).catch(() => {});
			}

			if (email) {
				// Pass the threepids we already fetched — for an already-configured
				// user this makes the whole call a no-op with zero extra requests.
				await ensureMatrixEmailNotifications(
					localpart,
					email,
					existing.threepids ?? [],
				).catch((e) =>
					console.error("[matrix] email notifications setup failed", e),
				);
			}

			return { user_id: userId };
		}
		if (getResp.status !== 404) {
			const text = await getResp.text();
			throw new Error(`Failed to check user: ${getResp.status} ${text}`);
		}
	} catch (err) {
		throw err;
	}

	// Create user if not found
	const password = crypto.randomUUID();
	const createBody: Record<string, unknown> = {
		password,
		displayname,
		// Email is bound as a threepid by ensureMatrixEmailNotifications below —
		// it must run anyway to register the email pusher.
		admin: false,
		deactivated: false,
	};

	let createResp = await fetch(
		`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: JSON.stringify(createBody),
		},
	);

	// Fallback for some deployments where v2 path is unavailable via proxy
	if (createResp.status === 404) {
		createResp = await fetch(
			`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${ADMIN_TOKEN}`,
				},
				body: JSON.stringify(createBody),
			},
		);
	}

	if (!createResp.ok) {
		const text = await createResp.text();
		throw new Error(`Failed to register user: ${createResp.status} ${text}`);
	}

	if (avatarUrl) {
		const mxc = await uploadMatrixMedia(avatarUrl).catch(() => null);
		if (mxc) {
			await fetch(
				`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${ADMIN_TOKEN}`,
					},
					body: JSON.stringify({ avatar_url: mxc }),
				},
			).catch(() => {});
		}
	}

	if (email) {
		// Fresh account: no threepids yet — pass [] to skip the lookup.
		await ensureMatrixEmailNotifications(localpart, email, []).catch((e) =>
			console.error("[matrix] email notifications setup failed", e),
		);
	}

	return { user_id: userId };
}

// Upload an image to the Matrix media repo and return its mxc:// URI.
// Profile/room avatars only render from mxc URIs, never from plain HTTP URLs.
async function uploadMatrixMedia(imageUrl: string): Promise<string | null> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");

	if (!/^https?:\/\//.test(imageUrl)) return null;

	const img = await fetch(imageUrl);
	if (!img.ok) return null;

	const resp = await fetch(
		`${BASE_URL}/_matrix/media/v3/upload?filename=avatar`,
		{
			method: "POST",
			headers: {
				"Content-Type": img.headers.get("content-type") || "image/png",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: await img.arrayBuffer(),
		},
	);
	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to upload media: ${resp.status} ${text}`);
	}
	const data = (await resp.json()) as { content_uri?: string };
	return data.content_uri || null;
}

type SynapseThreepid = { medium: string; address: string };

// Synapse sends "you have missed messages" emails only to users that have BOTH
// an email threepid and an email pusher. Platform users are provisioned via the
// Admin API without either, so this binds the email and registers the pusher.
// Idempotent — safe to call on every provisioning.
export async function ensureMatrixEmailNotifications(
	localpart: string,
	email: string,
	// Threepids already fetched by the caller — saves the extra user GET, and
	// lets an already-bound email short-circuit the whole call.
	knownThreepids?: SynapseThreepid[],
): Promise<{ threepidBound: boolean; pusherCreated: boolean }> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");

	const userId = `@${localpart}:${DOMAIN}`;
	const adminHeaders = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${ADMIN_TOKEN}`,
	};
	const normalizedEmail = email.trim().toLowerCase();

	// 1. Email threepid
	let threepids = knownThreepids;
	if (!threepids) {
		const getResp = await fetch(
			`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
			{ headers: adminHeaders },
		);
		if (!getResp.ok) {
			const text = await getResp.text();
			throw new Error(
				`Failed to get user threepids: ${getResp.status} ${text}`,
			);
		}
		const userData = (await getResp.json()) as {
			threepids?: SynapseThreepid[];
		};
		threepids = userData.threepids || [];
	}

	const alreadyBound = threepids.some(
		(t) => t.medium === "email" && t.address.toLowerCase() === normalizedEmail,
	);
	// Threepid and pusher are always created together (here and in the
	// backfill script), so a bound email means fully configured — skip the
	// pushers round-trip on every subsequent provisioning call.
	if (alreadyBound) {
		return { threepidBound: false, pusherCreated: false };
	}

	// PUT replaces the whole threepids list — merge with existing entries
	const putResp = await fetch(
		`${BASE_URL}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
		{
			method: "PUT",
			headers: adminHeaders,
			body: JSON.stringify({
				threepids: [
					...threepids,
					{ medium: "email", address: normalizedEmail },
				],
			}),
		},
	);
	if (!putResp.ok) {
		const text = await putResp.text();
		throw new Error(`Failed to bind email threepid: ${putResp.status} ${text}`);
	}
	const threepidBound = true;

	// 2. Email pusher
	const pushersResp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/users/${encodeURIComponent(userId)}/pushers`,
		{ headers: adminHeaders },
	);
	if (!pushersResp.ok) {
		const text = await pushersResp.text();
		throw new Error(`Failed to list pushers: ${pushersResp.status} ${text}`);
	}
	const pushersData = (await pushersResp.json()) as {
		pushers?: { app_id?: string; pushkey?: string }[];
	};
	const hasEmailPusher = (pushersData.pushers || []).some(
		(p) =>
			p.app_id === "m.email" && p.pushkey?.toLowerCase() === normalizedEmail,
	);

	let pusherCreated = false;
	if (!hasEmailPusher) {
		// Dedicated device id: minting a token for an existing device rotates its
		// access token, which would log out a live web session.
		const { accessToken } = await getMatrixUserToken(
			localpart,
			"svc_email_pusher",
		);
		const setResp = await fetch(`${BASE_URL}/_matrix/client/v3/pushers/set`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
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
		if (!setResp.ok) {
			const text = await setResp.text();
			throw new Error(`Failed to set email pusher: ${setResp.status} ${text}`);
		}
		pusherCreated = true;
	}

	return { threepidBound, pusherCreated };
}

// Mint a token for the room creator (the only member guaranteed elevated
// power) — used to flip the room's power levels.
async function getRoomCreatorToken(matrixRoomId: string) {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");

	const detailsResp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/rooms/${encodeURIComponent(matrixRoomId)}`,
		{ headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } },
	);
	if (!detailsResp.ok) {
		const text = await detailsResp.text();
		throw new Error(
			`Failed to get room details: ${detailsResp.status} ${text}`,
		);
	}
	const details = (await detailsResp.json()) as { creator?: string };
	const creatorLocalpart = details.creator
		? matrixIdToUserId(details.creator)
		: null;
	if (!creatorLocalpart) {
		throw new Error(`Room ${matrixRoomId} has no local creator`);
	}

	// Dedicated device id — never rotate a live web-session token.
	const token = await getMatrixUserToken(creatorLocalpart, "svc_room_admin");
	return { creatorMatrixId: details.creator as string, ...token };
}

async function setRoomPowerLevels(
	matrixRoomId: string,
	accessToken: string,
	powerLevels: Record<string, unknown>,
): Promise<void> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const resp = await fetch(
		`${BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(matrixRoomId)}/state/m.room.power_levels`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(powerLevels),
		},
	);
	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to set power levels: ${resp.status} ${text}`);
	}
}

// Freeze a room: history stays readable, members can't post (events_default
// above their level). The creator must KEEP PL 100 — Matrix auth rules forbid
// raising your own level, so demoting the creator would make the freeze
// unrecoverable; the creator technically could still post, but the chat UI
// hides the input once the ChatRoom status is Closed.
export async function makeRoomReadOnly(matrixRoomId: string): Promise<void> {
	const { creatorMatrixId, accessToken } =
		await getRoomCreatorToken(matrixRoomId);

	const powerLevels = {
		users: { [creatorMatrixId]: 100 },
		users_default: 0,
		events: {},
		events_default: 100,
		state_default: 50,
		ban: 50,
		kick: 50,
		redact: 50,
		invite: 50,
	};

	await setRoomPowerLevels(matrixRoomId, accessToken, powerLevels);
}

// Undo makeRoomReadOnly (e.g. an application chat reopened on re-apply):
// restore the default power levels so members can post again. Only lowers
// events_default (100 -> 0) and keeps the creator at 100 — both changes the
// creator's own token is allowed to make.
export async function makeRoomWritable(matrixRoomId: string): Promise<void> {
	const { creatorMatrixId, accessToken } =
		await getRoomCreatorToken(matrixRoomId);

	const powerLevels = {
		users: { [creatorMatrixId]: 100 },
		users_default: 0,
		events: {},
		events_default: 0,
		state_default: 50,
		ban: 50,
		kick: 50,
		redact: 50,
		invite: 50,
	};

	await setRoomPowerLevels(matrixRoomId, accessToken, powerLevels);
}

// (Re-)invite a user into an existing room on behalf of the initiator.
// Returns true when a fresh invite was sent; false when Matrix rejects it
// because the target is already joined/invited (403).
export async function inviteUserToRoom(
	initiatorLocalpart: string,
	matrixRoomId: string,
	targetLocalpart: string,
): Promise<boolean> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");
	// Dedicated device id — never rotate a live web-session token.
	const { accessToken } = await getMatrixUserToken(
		initiatorLocalpart,
		"svc_backend",
	);

	const resp = await fetch(
		`${BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(matrixRoomId)}/invite`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ user_id: `@${targetLocalpart}:${DOMAIN}` }),
		},
	);
	if (resp.ok) return true;
	if (resp.status === 403) return false;
	const text = await resp.text();
	throw new Error(`Failed to invite user: ${resp.status} ${text}`);
}

// Send a plain text message into a room on behalf of a platform user (plain
// HTTP — no matrix-js-sdk). Used e.g. to deliver an offer message when the
// chat room already exists and ensureChatRoom's firstMessage doesn't apply.
export async function sendRoomMessageAs(
	localpart: string,
	matrixRoomId: string,
	text: string,
): Promise<void> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	// Dedicated device id — never rotate a live web-session token.
	const { accessToken } = await getMatrixUserToken(localpart, "svc_backend");

	const txnId = crypto.randomUUID();
	const resp = await fetch(
		`${BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(matrixRoomId)}/send/m.room.message/${txnId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ msgtype: "m.text", body: text }),
		},
	);
	if (!resp.ok) {
		const respText = await resp.text();
		throw new Error(`Failed to send message: ${resp.status} ${respText}`);
	}
}

// Permanently deactivate a Matrix account (GDPR erase): revokes tokens,
// removes pushers/threepids, wipes displayname/avatar. Irreversible.
export async function deactivateMatrixUser(localpart: string): Promise<void> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");
	const userId = `@${localpart}:${DOMAIN}`;

	const resp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: JSON.stringify({ erase: true }),
		},
	);
	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to deactivate user: ${resp.status} ${text}`);
	}
}

// Delete a Matrix room for ALL members (block + purge): the history disappears
// on both sides. Used when a platform user is deleted. Async on Synapse's side.
export async function deleteMatrixRoom(matrixRoomId: string): Promise<void> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");

	const resp = await fetch(
		`${BASE_URL}/_synapse/admin/v2/rooms/${encodeURIComponent(matrixRoomId)}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: JSON.stringify({ block: true, purge: true }),
		},
	);
	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to delete room: ${resp.status} ${text}`);
	}
}

// Matrix user id -> platform user id (localpart). Returns null for ids that
// don't belong to this homeserver.
export function matrixIdToUserId(matrixUserId: string): string | null {
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");
	const match = matrixUserId.match(/^@(.+):(.+)$/);
	if (!match) return null;
	const [, localpart, domain] = match;
	if (domain !== DOMAIN) return null;
	return localpart;
}

// Current member ids of a room via the Synapse Admin API.
export async function getRoomMemberIds(roomId: string): Promise<string[]> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");

	const resp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}/members`,
		{ headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } },
	);

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to get room members: ${resp.status} ${text}`);
	}

	const data = (await resp.json()) as { members?: string[] };
	return data.members || [];
}

export type MatrixUserToken = {
	accessToken: string;
	deviceId?: string;
	userId?: string;
};

export async function getMatrixUserToken(
	platformUserId: string,
	deviceId?: string,
): Promise<MatrixUserToken> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");

	const userId = `@${platformUserId}:${DOMAIN}`;
	const desiredDeviceId = deviceId || `web_${platformUserId}`;

	const resp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: JSON.stringify({
				device_id: desiredDeviceId,
				initial_device_display_name: "GDHub Web",
			}),
		},
	);

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to get matrix token: ${resp.status} ${text}`);
	}

	const data = (await resp.json()) as {
		access_token: string;
		device_id?: string;
		user_id?: string;
	};

	return {
		accessToken: data.access_token,
		deviceId: data.device_id || desiredDeviceId,
		userId: data.user_id,
	};
}
