/**
 * Synapse builds the links in its "you have missed messages" emails as
 * `{email.client_base_url}/#/room/{roomId}[/{eventId}]` and nothing about that
 * shape is configurable. This turns one into a link into our own chat drawer.
 *
 * The room id lives in the URL *fragment*, which never reaches the server, so
 * the translation happens in the browser.
 */
export function chatDeepLinkFromHash(hash: string): string {
	const match = hash.match(/^#\/room\/([^/?]+)/);
	if (!match) return "/hub?chat=1";

	// Room ids are `!opaque:server` — Synapse leaves them unencoded, mail
	// clients sometimes do not.
	const roomId = decodeURIComponent(match[1]);
	return `/hub?chat=1&roomId=${encodeURIComponent(roomId)}`;
}
