import type { MatrixClient, Method } from "matrix-js-sdk";
import { createContext, useContext, useMemo } from "react";
import {
	type LinkPreview,
	parseLinkPreview,
	parseMxc,
} from "@/helpers/chat-media";
import { useChat } from "../useChat";

export type Thumbnail = { width: number; height: number };

/** Where message media comes from: Matrix in the app, fixtures in stories. */
export type ChatMediaLoaders = {
	loadMedia: (mxc: string, thumbnail?: Thumbnail) => Promise<Blob>;
	loadPreview: (url: string) => Promise<LinkPreview | null>;
};

// String values, not SDK enums, so importing this does not bundle the SDK.
const GET = "GET" as Method;
const CLIENT_V1 = "/_matrix/client/v1";

/**
 * Synapse serves media only to an authenticated request (MSC3916), so the
 * bytes come through the client's own HTTP layer, token and refresh included.
 */
export function matrixMediaLoaders(client: MatrixClient): ChatMediaLoaders {
	return {
		loadMedia: async (mxc, thumbnail) => {
			const parts = parseMxc(mxc);
			if (!parts) throw new Error(`Not an mxc URI: ${mxc}`);
			const id = `${encodeURIComponent(parts.serverName)}/${encodeURIComponent(parts.mediaId)}`;
			return client.http.authedRequest<Blob>(
				GET,
				thumbnail ? `/media/thumbnail/${id}` : `/media/download/${id}`,
				thumbnail
					? {
							width: String(thumbnail.width),
							height: String(thumbnail.height),
							method: "scale",
						}
					: undefined,
				undefined,
				{ prefix: CLIENT_V1, rawResponseBody: true },
			);
		},
		// v1 rather than `client.getUrlPreview`, which still calls the legacy media/v3 path.
		loadPreview: async (url) =>
			parseLinkPreview(
				await client.http.authedRequest<Record<string, unknown>>(
					GET,
					"/media/preview_url",
					{ url },
					undefined,
					{ prefix: CLIENT_V1, priority: "low" },
				),
			),
	};
}

export const ChatMediaContext = createContext<ChatMediaLoaders | null>(null);

/** Null until the Matrix client is up. */
export function useChatMediaLoaders(): ChatMediaLoaders | null {
	const override = useContext(ChatMediaContext);
	const client = useChat((s) => s.chatClient);
	return useMemo(
		() => override ?? (client ? matrixMediaLoaders(client) : null),
		[override, client],
	);
}
