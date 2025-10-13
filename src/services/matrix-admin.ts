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
			const updatingData: Record<string, unknown> = {
				displayname,
				avatar_url: avatarUrl,
			};

			// Optionally update display name
			if (displayname || avatarUrl) {
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
		email,
		avatar_url: avatarUrl,
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

	return { user_id: userId };
}

export async function getMatrixUserToken(platformUserId: string) {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");

	const userId = `@${platformUserId}:${DOMAIN}`;

	const resp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
		},
	);

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to get matrix token: ${resp.status} ${text}`);
	}

	const data = (await resp.json()) as { access_token: string };

	return { accessToken: data.access_token };
}
