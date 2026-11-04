"use client";

import { IconCopy, IconDownload, IconShare3 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Image,
	Input,
	Modal,
	Skeleton,
	Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useShareCard } from "@/hooks/checkpoint-share";
import { sharePost } from "@/lib/checkpoints/share-card";
import styles from "./style.module.scss";

const { Text } = Typography;

/**
 * Frame 12.20.1 `Tb2oP` (GDHUB-144): the verdict as a card image, and the post
 * to go with it, the project's link inside the text. Share hands both, image
 * and text, to the system's share sheet, where the author picks LinkedIn, X or
 * Telegram; where the browser cannot share a file, they download and copy.
 */
export function ShareResultModal({
	checkpointId,
	open,
	onClose,
}: {
	checkpointId: string;
	open: boolean;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data: card, isPending, isError } = useShareCard(checkpointId, open);
	const [edited, setEdited] = useState<string | null>(null);
	// The card drawn once: the preview, the download and the share all read this file.
	const [png, setPng] = useState<{ file: File; url: string } | null>(null);

	const text =
		edited ??
		(card
			? sharePost({
					number: card.number,
					verdict: card.verdict,
					project: card.project.name,
					curator: card.curator.name,
					line: card.line,
					link: new URL(`/project/${card.project.slug}`, window.location.origin)
						.href,
				})
			: "");

	useEffect(() => {
		if (!card) return;
		let url: string | null = null;
		let live = true;
		fetch(card.image)
			.then((response) => response.blob())
			.then((blob) => {
				if (!live) return;
				url = URL.createObjectURL(blob);
				const file = new File(
					[blob],
					`${card.project.slug}-checkpoint-${card.number}.png`,
					{ type: "image/png" },
				);
				setPng({ file, url });
			})
			.catch(() => {});
		return () => {
			live = false;
			if (url) URL.revokeObjectURL(url);
		};
	}, [card]);

	const canShare = !!png && !!navigator.canShare?.({ files: [png.file] });

	const share = async () => {
		if (!png) return;
		try {
			await navigator.share({ files: [png.file], text });
		} catch {
			// The author closed the sheet.
		}
	};

	const copy = async () => {
		await navigator.clipboard.writeText(text);
		message.success(t("checkpoints.share.copied", "Text copied"));
	};

	return (
		<Modal
			centered
			destroyOnHidden
			width={600}
			open={open}
			title={t("checkpoints.share.title", "Share the result")}
			onCancel={onClose}
			footer={null}
		>
			{isError ? (
				<Text type="secondary">
					{t(
						"checkpoints.share.failed",
						"The card could not be made right now. Try again in a minute.",
					)}
				</Text>
			) : isPending || !card ? (
				<Flex vertical gap={16}>
					<Skeleton.Node active className={styles.imageSkeleton} />
					<Skeleton active paragraph={{ rows: 3 }} title={false} />
				</Flex>
			) : (
				<Flex vertical gap={16}>
					{png ? (
						<Image
							src={png.url}
							alt={card.line}
							preview={false}
							className={styles.image}
						/>
					) : (
						<Skeleton.Node active className={styles.imageSkeleton} />
					)}
					<Input.TextArea
						value={text}
						onChange={(event) => setEdited(event.target.value)}
						autoSize={{ minRows: 4, maxRows: 8 }}
						aria-label={t("checkpoints.share.post", "The post")}
					/>
					<Flex gap={8} wrap>
						{canShare && (
							<Button
								type="primary"
								icon={<IconShare3 size={16} />}
								onClick={share}
							>
								{t("checkpoints.share.share", "Share")}
							</Button>
						)}
						<Button
							type={canShare ? "default" : "primary"}
							icon={<IconDownload size={16} />}
							href={png?.url}
							download={png?.file.name}
							disabled={!png}
						>
							{t("checkpoints.share.download", "Download image")}
						</Button>
						<Button icon={<IconCopy size={16} />} onClick={copy}>
							{t("checkpoints.share.copy", "Copy text")}
						</Button>
					</Flex>
				</Flex>
			)}
		</Modal>
	);
}
