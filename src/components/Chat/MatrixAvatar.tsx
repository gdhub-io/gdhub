import { Avatar, type AvatarProps } from "antd";
import { useEffect, useState } from "react";
import { useChat } from "./useChat";

type MatrixAvatarProps = Omit<AvatarProps, "src"> & {
	/** Raw mxc:// URI (member.getMxcAvatarUrl() / user.avatarUrl). */
	mxcUrl?: string | null;
	size?: number;
};

/**
 * Avatar that loads Matrix media through the AUTHENTICATED media endpoint.
 * Synapse's authenticated media (MSC3916) rejects token-less requests, so a
 * plain `<img src>` from `getAvatarUrl()` 404s. We fetch the thumbnail with the
 * access token and hand a blob URL to antd's Avatar; falls back to children/icon
 * when there is no avatar or the fetch fails.
 */
export function MatrixAvatar({
	mxcUrl,
	size = 64,
	children,
	...rest
}: MatrixAvatarProps) {
	const { chatClient } = useChat();
	const [blobUrl, setBlobUrl] = useState<string>();

	useEffect(() => {
		if (!mxcUrl || !chatClient) {
			setBlobUrl(undefined);
			return;
		}

		const httpUrl = chatClient.mxcUrlToHttp(
			mxcUrl,
			size,
			size,
			"crop",
			false,
			true,
			true, // useAuthentication -> /_matrix/client/v1/media/...
		);
		const token = chatClient.getAccessToken();
		if (!httpUrl || !token) {
			setBlobUrl(undefined);
			return;
		}

		let objectUrl: string | undefined;
		let cancelled = false;
		fetch(httpUrl, { headers: { Authorization: `Bearer ${token}` } })
			.then((res) => (res.ok ? res.blob() : Promise.reject(res.status)))
			.then((blob) => {
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setBlobUrl(objectUrl);
			})
			.catch(() => {
				if (!cancelled) setBlobUrl(undefined);
			});

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [mxcUrl, chatClient, size]);

	return (
		<Avatar {...rest} src={blobUrl}>
			{children}
		</Avatar>
	);
}
