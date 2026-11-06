/**
 * Synapse builds the links in its "you have missed messages" emails as
 * `{email.client_base_url}/#/room/{roomId}[/{eventId}]` and nothing about that
 * shape is configurable. This turns one into a link into our own chat drawer.
 *
 * The room id lives in the URL *fragment*, which never reaches the server, so
 * the translation happens in the browser.
 */
export function roomIdFromHash(hash: string): string | null {
	const match = hash.match(/^#\/room\/([^/?]+)/);
	// Room ids are `!opaque:server` — Synapse leaves them unencoded, mail
	// clients sometimes do not.
	return match ? decodeURIComponent(match[1]) : null;
}

export function chatDeepLinkFromHash(hash: string): string {
	const roomId = roomIdFromHash(hash);
	return roomId
		? `/hub?chat=1&roomId=${encodeURIComponent(roomId)}`
		: "/hub?chat=1";
}
