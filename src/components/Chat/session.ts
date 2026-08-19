"use client";

import { type SignOutParams, signOut } from "next-auth/react";
import {
	clearMatrixDeviceId,
	getMatrixDeviceId,
} from "@/helpers/matrix-device";
import { clearPusherCache } from "@/helpers/matrix-pushers";
import { clearMatrixClientStore } from "@/helpers/matrix-store";
import { useChat } from "./useChat";

/**
 * Tear down the browser's Matrix session.
 *
 * Signing out of GDHub has to end chat access too: the access token stays
 * valid on the homeserver until it is revoked, and the cached timeline, the
 * device id and the pusher bookkeeping all outlive the account otherwise —
 * the next person signing in on this browser would inherit them.
 *
 * `expired` means the homeserver already rejected the token: the same account
 * is about to reconnect, so only the dead token goes — the device, its pusher
 * and the cached timeline stay.
 */
export async function endChatSession({ expired = false } = {}) {
	const { chatClient, setChatClient, setReady } = useChat.getState();
	const matrixUserId = chatClient?.getUserId() ?? null;
	// Hand the server the token this browser holds: the cached copy may be gone.
	const token = chatClient?.getAccessToken() ?? undefined;
	const deviceId = getMatrixDeviceId();

	try {
		chatClient?.stopClient();
	} catch {}
	setChatClient(null);
	setReady(false);

	if (deviceId) {
		try {
			// keepalive: sign-out navigates away immediately after this.
			await fetch("/api/chat/session", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, token, expired }),
				keepalive: true,
			});
		} catch (error) {
			console.error("[chat] failed to end the matrix session", error);
		}
	}

	if (expired) return;

	clearPusherCache();
	clearMatrixDeviceId();

	if (matrixUserId) {
		await clearMatrixClientStore(matrixUserId).catch(() => {});
	}
}

/** Sign out of the platform, ending the Matrix session first. */
export async function signOutWithChat(
	options?: SignOutParams<true>,
): Promise<void> {
	await endChatSession().catch(() => {});
	await signOut(options);
}
