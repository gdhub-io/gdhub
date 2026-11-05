import { IconPhotoOff } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Image, Skeleton } from "antd";
import { useState } from "react";
import { fitWithin } from "@/helpers/chat-media";
import type { TimelineImage } from "../model/timeline";
import styles from "./style.module.scss";
import { useMediaUrl } from "./useMediaUrl";

/** Longest side of an image in the timeline — frame `TUdvE`. */
const MAX_BOX = 280;
/** Box when the event carries no dimensions. */
const FALLBACK_BOX = { width: 240, height: 180 };
/** One of Synapse's default thumbnail sizes, ≥ 2× the box for sharp HiDPI. */
const THUMBNAIL = { width: 640, height: 640 };

export function ImageUnavailable({ width }: { width: number }) {
	const { t } = useTranslate();
	return (
		<div className={styles.unavailable} style={{ width }}>
			<IconPhotoOff size={20} />
			<span>{t("chat.media.imageUnavailable", "Image unavailable")}</span>
		</div>
	);
}

/** An `m.image` message: thumbnail, then the full file in antd's viewer (`NYgIg`). */
export function ChatImage({ image }: { image: TimelineImage }) {
	const box =
		image.w && image.h ? fitWithin(image.w, image.h, MAX_BOX) : FALLBACK_BOX;
	const thumb = useMediaUrl(image.mxc, THUMBNAIL);
	const [open, setOpen] = useState(false);
	// The original is fetched only once someone opens it.
	const full = useMediaUrl(open ? image.mxc : null);

	if (thumb.status === "error") return <ImageUnavailable width={box.width} />;
	if (thumb.status === "loading") {
		return (
			<div className={styles.skeleton} style={box}>
				<Skeleton.Image active />
			</div>
		);
	}
	return (
		<Image
			src={thumb.url}
			alt={image.name}
			width={box.width}
			height={box.height}
			classNames={{ root: styles.image, image: styles.fill }}
			preview={{
				open,
				onOpenChange: setOpen,
				src: full.url ?? thumb.url,
			}}
		/>
	);
}
