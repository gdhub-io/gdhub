import * as sdk from "matrix-js-sdk";
import { matrixStoreName } from "@/helpers/matrix-store";

export type CreateMatrixClientOptions = {
	accessToken: string;
	userId: string;
	deviceId?: string;
};

/** How much of each room's timeline the initial sync brings back. */
export const INITIAL_SYNC_LIMIT = 20;

/**
 * The Matrix client for the browser session.
 *
 * Backed by IndexedDB so a page load resumes the sync instead of replaying a
 * full initial sync every time; members are lazy-loaded, which is what keeps
 * that first sync small on accounts with many rooms.
 */
export async function createMatrixClient(opts: CreateMatrixClientOptions) {
	let store: sdk.IndexedDBStore | undefined;

	try {
		store = new sdk.IndexedDBStore({
			indexedDB: window.indexedDB,
			localStorage: window.localStorage,
			dbName: matrixStoreName(opts.userId),
		});
	} catch (error) {
		// Private browsing and blocked storage — fall back to the memory store.
		console.warn("[matrix] persistent store unavailable", error);
		store = undefined;
	}

	const client = sdk.createClient({
		baseUrl: process.env.NEXT_PUBLIC_MATRIX_CHAT_BASE_URL as string,
		accessToken: opts.accessToken,
		userId: opts.userId,
		deviceId: opts.deviceId,
		store,
		timelineSupport: true,
	});

	if (store) {
		try {
			// Must run after createClient, per the SDK's own contract.
			await store.startup();
		} catch (error) {
			console.warn(
				"[matrix] store startup failed, syncing from scratch",
				error,
			);
		}
	}

	return client;
}
