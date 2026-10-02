"use client";

import {
	IconBrandFacebook,
	IconBrandLinkedin,
	IconBrandTelegram,
	IconBrandX,
	IconCopy,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Image, Modal, Typography } from "antd";
import type { ReactNode } from "react";
import {
	SHARE_NETWORKS,
	type ShareNetwork,
	shareIntentUrl,
} from "@/helpers/share";
import styles from "./style.module.scss";

const { Text } = Typography;

const NETWORKS: Record<ShareNetwork, { label: string; icon: ReactNode }> = {
	linkedin: { label: "LinkedIn", icon: <IconBrandLinkedin size={16} /> },
	telegram: { label: "Telegram", icon: <IconBrandTelegram size={16} /> },
	x: { label: "X", icon: <IconBrandX size={16} /> },
	facebook: { label: "Facebook", icon: <IconBrandFacebook size={16} /> },
};

export type ShareTarget = {
	/** The page to share, from the site root: `/devlog/abc`. */
	path: string;
	/** What the post says next to the link, where the network allows any. */
	text: string;
	/** The page's OG card, shown as the network will show it. */
	image: string;
};

/**
 * Frame `j88gi`. Shows the card a link to the page unfolds into, then hands the
 * link to the network the viewer picks — they post from their own account.
 */
export const ShareModal = ({
	target,
	onClose,
}: {
	target: ShareTarget | null;
	onClose: () => void;
}) => {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const copyLabel = t("share.copy", "Copy link");
	const url = target ? new URL(target.path, window.location.origin).href : "";

	const handleCopy = async () => {
		await navigator.clipboard.writeText(url);
		message.success(t("share.copied", "Link copied"));
	};

	return (
		<Modal
			centered
			destroyOnHidden
			width={600}
			open={Boolean(target)}
			title={t("share.title", "Share post")}
			onCancel={onClose}
			footer={null}
		>
			{target && (
				<Flex vertical gap={16}>
					<div className={styles.card}>
						<Image
							src={target.image}
							alt=""
							preview={false}
							className={styles.image}
						/>
						<Flex align="center" gap={12} className={styles.meta}>
							<Flex vertical gap={4} flex={1} className={styles.text}>
								<Text strong>{target.text}</Text>
								<Text type="secondary" ellipsis className={styles.link}>
									{url.replace(/^https?:\/\//, "")}
								</Text>
							</Flex>
							<Button
								type="text"
								aria-label={copyLabel}
								title={copyLabel}
								icon={<IconCopy size={16} />}
								onClick={handleCopy}
							/>
						</Flex>
					</div>

					<Flex gap={8} wrap>
						{SHARE_NETWORKS.map((network) => (
							<Button
								key={network}
								icon={NETWORKS[network].icon}
								href={shareIntentUrl(network, { url, text: target.text })}
								target="_blank"
								rel="noopener noreferrer"
							>
								{NETWORKS[network].label}
							</Button>
						))}
					</Flex>
				</Flex>
			)}
		</Modal>
	);
};
