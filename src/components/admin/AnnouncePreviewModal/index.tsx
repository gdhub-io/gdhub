"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Image, Modal, message, Space, Spin, Typography } from "antd";
import axios from "axios";

const { Text } = Typography;

export type AnnounceChannel = "linkedin" | "discord" | "telegram";

export const channelLabels: Record<AnnounceChannel, string> = {
	linkedin: "LinkedIn",
	discord: "Discord",
	telegram: "Telegram",
};

export type AnnounceTarget = {
	/** Announce endpoint: GET builds the preview, POST publishes it. */
	apiPath: string;
	channel: AnnounceChannel;
};

type AnnouncePreviewResponse = {
	channel: AnnounceChannel;
	message: string;
	image: string | null;
};

const errorText = (error: unknown, fallback: string) =>
	axios.isAxiosError(error)
		? error.response?.data?.error || error.message
		: fallback;

/**
 * Shows the exact text that will be posted to a social channel and publishes it
 * on confirm. Shared by the blog-post and devlog-post admin tables.
 */
export const AnnouncePreviewModal = ({
	target,
	onClose,
}: {
	target: AnnounceTarget | null;
	onClose: () => void;
}) => {
	const {
		data: preview,
		isFetching: isPreviewLoading,
		isError: isPreviewError,
		error: previewError,
	} = useQuery({
		queryKey: ["admin", "announce-preview", target?.apiPath, target?.channel],
		queryFn: () =>
			axios
				.get<AnnouncePreviewResponse>(target?.apiPath as string, {
					params: { channel: target?.channel },
				})
				.then((res) => res.data),
		enabled: Boolean(target),
	});

	const { mutateAsync: announce, isPending: isPosting } = useMutation({
		mutationFn: ({ apiPath, channel }: AnnounceTarget) =>
			axios.post(apiPath, { channel }),
	});

	const handleConfirm = async () => {
		if (!target) return;

		try {
			await announce(target);
			message.success(`Posted to ${channelLabels[target.channel]}`);
			onClose();
		} catch (error) {
			message.error(
				`Failed to post to ${channelLabels[target.channel]}: ${errorText(error, "Unknown error")}`,
			);
		}
	};

	return (
		<Modal
			open={Boolean(target)}
			title={
				target
					? `Announce preview — ${channelLabels[target.channel]}`
					: "Announce preview"
			}
			onCancel={onClose}
			okText={target ? `Post to ${channelLabels[target.channel]}` : "Post"}
			okButtonProps={{ disabled: isPreviewLoading || isPreviewError }}
			confirmLoading={isPosting}
			onOk={handleConfirm}
			destroyOnHidden
		>
			{isPreviewLoading ? (
				<div style={{ textAlign: "center", padding: 32 }}>
					<Spin />
				</div>
			) : isPreviewError ? (
				<Text type="danger">
					{errorText(previewError, "Failed to build preview")}
				</Text>
			) : (
				<Space orientation="vertical" size={12} style={{ width: "100%" }}>
					<div
						style={{
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
							fontSize: 13,
							background: "rgba(0,0,0,0.04)",
							borderRadius: 8,
							padding: 12,
							maxHeight: 320,
							overflow: "auto",
						}}
					>
						{preview?.message}
					</div>
					{preview?.image ? (
						<Image
							src={preview.image}
							alt="Announcement preview"
							style={{
								width: "100%",
								borderRadius: 8,
								border: "1px solid rgba(0,0,0,0.06)",
							}}
						/>
					) : null}
				</Space>
			)}
		</Modal>
	);
};
