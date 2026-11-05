import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Image, Typography } from "antd";
import { useState } from "react";
import { firstLink, type LinkPreview } from "@/helpers/chat-media";
import { youTubeVideoId } from "@/helpers/video";
import styles from "./style.module.scss";
import { useLinkPreview } from "./useLinkPreview";
import { useMediaUrl } from "./useMediaUrl";

const PREVIEW_IMAGE = { width: 96, height: 96 };
const COVER_IMAGE = { width: 640, height: 640 };

function PreviewImage({
	mxc,
	thumbnail,
	className,
}: {
	mxc: string;
	thumbnail: { width: number; height: number };
	className: string;
}) {
	const media = useMediaUrl(mxc, thumbnail);
	if (media.status !== "ready") return <span className={className} />;
	return (
		<Image
			src={media.url}
			alt=""
			preview={false}
			classNames={{ root: className, image: styles.fill }}
		/>
	);
}

/** Frame `ucBkR`: the card under a message for its first link. */
export function LinkPreviewCard({
	url,
	preview,
}: {
	url: string;
	preview: LinkPreview;
}) {
	return (
		<Typography.Link
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className={styles.card}
		>
			{preview.imageMxc && (
				<PreviewImage
					mxc={preview.imageMxc}
					thumbnail={PREVIEW_IMAGE}
					className={styles.cardImage}
				/>
			)}
			<span className={styles.cardText}>
				{preview.siteName && (
					<Typography.Text type="secondary" className={styles.caption}>
						{preview.siteName}
					</Typography.Text>
				)}
				{preview.title && (
					<Typography.Text strong ellipsis className={styles.cardTitle}>
						{preview.title}
					</Typography.Text>
				)}
				{preview.description && (
					<Typography.Paragraph
						type="secondary"
						ellipsis={{ rows: 2 }}
						className={styles.cardDescription}
					>
						{preview.description}
					</Typography.Paragraph>
				)}
			</span>
		</Typography.Link>
	);
}

/**
 * Frames `KaMFv` / `IT7LP`: a cover until clicked, then the player. The cover
 * is Synapse's copy of og:image, so nothing reaches Google before the click.
 */
export function YouTubeEmbed({
	videoId,
	preview,
	initiallyPlaying = false,
}: {
	videoId: string;
	preview?: LinkPreview | null;
	initiallyPlaying?: boolean;
}) {
	const { t } = useTranslate();
	const [playing, setPlaying] = useState(initiallyPlaying);
	const title = preview?.title ?? t("chat.media.youtubeVideo", "YouTube video");

	return (
		<div className={styles.youtube}>
			{playing ? (
				<iframe
					className={styles.frame}
					src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1`}
					title={title}
					allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
					allowFullScreen
					referrerPolicy="strict-origin-when-cross-origin"
				/>
			) : (
				// ui-guard-ignore the whole cover is the play target; antd Button cannot carry an image fill
				<button
					type="button"
					className={styles.cover}
					aria-label={t("chat.media.play", "Play {title}", { title })}
					onClick={() => setPlaying(true)}
				>
					{preview?.imageMxc && (
						<PreviewImage
							mxc={preview.imageMxc}
							thumbnail={COVER_IMAGE}
							className={styles.coverImage}
						/>
					)}
					<span className={styles.play}>
						<IconPlayerPlayFilled size={20} />
					</span>
				</button>
			)}
			{(preview?.siteName || preview?.title) && (
				<span className={styles.youtubeCaption}>
					{preview.siteName && (
						<Typography.Text type="secondary" className={styles.caption}>
							{preview.siteName}
						</Typography.Text>
					)}
					{preview.title && (
						<Typography.Text strong ellipsis className={styles.cardTitle}>
							{preview.title}
						</Typography.Text>
					)}
				</span>
			)}
		</div>
	);
}

/** What a text message's first link adds under the bubble: a player, a card, or nothing. */
function LinkAttachmentFor({ url }: { url: string }) {
	const preview = useLinkPreview(url);
	const videoId = youTubeVideoId(url);
	if (videoId) return <YouTubeEmbed videoId={videoId} preview={preview} />;
	return preview ? <LinkPreviewCard url={url} preview={preview} /> : null;
}

/** The first link's card; messages without one mount no preview query. */
export function LinkAttachment({ text }: { text: string }) {
	const url = firstLink(text);
	return url ? <LinkAttachmentFor url={url} /> : null;
}
