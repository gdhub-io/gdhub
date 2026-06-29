"use client";

import { IconPlayerPlayFilled } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import YouTube from "react-youtube";
import type { Options } from "youtube-player/dist/types";
import styles from "./ProjectVideoCover.module.scss";

type ProjectVideoCoverProps = {
	coverImage?: string | null;
	videoLink?: string | null;
	alt?: string | null;
	/** Optional duration badge, e.g. "1:32" */
	duration?: string | null;
};

/**
 * Project cover with an inline video. Shows the cover image with a centered
 * play affordance; clicking swaps to the YouTube player (pitch / gameplay reel).
 * Shared between the project page and the vacancy page.
 */
export function ProjectVideoCover({
	coverImage,
	videoLink,
	alt = "Project cover",
	duration,
}: ProjectVideoCoverProps) {
	const [showVideo, setShowVideo] = useState(false);

	if (!coverImage && !videoLink) return null;

	if (showVideo && videoLink) {
		const opts: Options = { playerVars: { autoplay: 1 } };
		return (
			<YouTube
				className={styles.videoCover}
				videoId={videoLink}
				opts={opts}
				onEnd={() => setShowVideo(false)}
			/>
		);
	}

	return (
		<div className={styles.cover}>
			{coverImage && (
				<Image
					src={coverImage}
					alt={alt || "Project cover"}
					fill
					style={{ objectFit: "cover" }}
				/>
			)}
			{videoLink && (
				<button
					type="button"
					className={styles.playButton}
					onClick={() => setShowVideo(true)}
					aria-label="Play video"
				>
					<IconPlayerPlayFilled size={22} />
				</button>
			)}
			{duration && <span className={styles.duration}>{duration}</span>}
		</div>
	);
}
