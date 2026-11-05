import { IconAlertCircle, IconPhoto, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Image, Progress, Typography } from "antd";
import { IconTile } from "@/components/ui";
import { formatBytes } from "@/helpers/chat-media";
import styles from "./style.module.scss";

export type ComposerAttachment = {
	name: string;
	/** A local object URL of the picked file; no token needed. */
	previewUrl?: string;
} & (
	| { status: "uploading"; progress: number }
	| { status: "ready"; size: number }
	| { status: "error"; error: string }
);

/** Frame `g3USr`: the picked image above the text — uploading, ready or refused. */
export function AttachmentChip({
	attachment,
	onRemove,
}: {
	attachment: ComposerAttachment;
	onRemove?: () => void;
}) {
	const { t } = useTranslate();
	const failed = attachment.status === "error";

	return (
		<div className={styles.chip} data-error={failed || undefined}>
			{failed || !attachment.previewUrl ? (
				<IconTile
					icon={failed ? IconAlertCircle : IconPhoto}
					ink={failed ? "var(--gd-danger-solid)" : undefined}
				/>
			) : (
				<Image
					src={attachment.previewUrl}
					alt=""
					preview={false}
					width={40}
					height={40}
					classNames={{ root: styles.chipThumb, image: styles.chipThumbImg }}
				/>
			)}
			<div className={styles.chipText}>
				<Typography.Text ellipsis className={styles.chipName}>
					{attachment.name}
				</Typography.Text>
				{attachment.status === "uploading" && (
					<Progress
						percent={Math.round(attachment.progress * 100)}
						size="small"
						className={styles.chipProgress}
					/>
				)}
				{attachment.status === "ready" && (
					<Typography.Text type="secondary" className={styles.chipMeta}>
						{formatBytes(attachment.size)}
					</Typography.Text>
				)}
				{failed && (
					<Typography.Text type="danger" className={styles.chipMeta}>
						{attachment.error}
					</Typography.Text>
				)}
			</div>
			<Button
				type="text"
				icon={<IconX size={16} />}
				aria-label={
					attachment.status === "uploading"
						? t("chat.media.cancelUpload", "Cancel upload")
						: t("chat.media.removeImage", "Remove image")
				}
				onClick={onRemove}
			/>
		</div>
	);
}
