/**
 * The browser-side Matrix cache, addressed without touching matrix-js-sdk —
 * sign-out lives on public pages too, and importing the SDK there would drag
 * it into those bundles.
 */

/** Per user: a shared database would hand the next account someone else's rooms. */
export function matrixStoreName(userId: string) {
	return `gdhub-chat:${userId}`;
}

/** Wipe the cached timeline of a signed-out account from this browser. */
export async function clearMatrixClientStore(userId: string): Promise<void> {
	if (typeof window === "undefined" || !window.indexedDB) return;

	await new Promise<void>((resolve) => {
		// The SDK prefixes whatever dbName it is given.
		const request = window.indexedDB.deleteDatabase(
			`matrix-js-sdk:${matrixStoreName(userId)}`,
		);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
}
