"use client";

import { IconPlayerPlayFilled } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { toPlayableVideoUrl } from "@/helpers/video";
import styles from "./ProjectVideoCover.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type ProjectVideoCoverProps = {
	coverImage?: string | null;
	videoLink?: string | null;
	alt?: string | null;
	/** Optional duration badge, e.g. "1:32" */
	duration?: string | null;
	/** Extra class for the cover/player box — sizing, radius, layout. */
	className?: string;
	/** Content painted over the cover image (title, gradient, badges). */
	children?: React.ReactNode;
	/** Custom play affordance. Defaults to a centered round button. */
	renderPlay?: (play: () => void) => React.ReactNode;
};

/**
 * Project cover with an inline video. Shows the cover image with a play
 * affordance; clicking swaps to the player (pitch / gameplay reel).
 *
 * Uses `react-player`, so `videoLink` may be a full URL of any supported
 * service (YouTube, Vimeo, Twitch, TikTok, …) or a legacy bare YouTube ID —
 * all play consistently. Shared between the project page, the vacancy page and
 * the compact project card in the talent card.
 */
export function ProjectVideoCover({
	coverImage,
	videoLink,
	alt = "Project cover",
	duration,
	className,
	children,
	renderPlay,
}: ProjectVideoCoverProps) {
	const [showVideo, setShowVideo] = useState(false);
	// Keep `playing` controlled and in sync with the actual player state.
	// A hard-coded `playing` prop makes react-player force playback back on
	// whenever the browser auto-pauses the video (e.g. on tab switch).
	const [playing, setPlaying] = useState(false);

	// Nothing to show — unless the caller paints its own overlay on the box.
	if (!coverImage && !videoLink && !children) return null;

	const play = () => {
		setShowVideo(true);
		setPlaying(true);
	};

	if (showVideo && videoLink) {
		return (
			<div className={`${styles.videoCover} ${className ?? ""}`}>
				<ReactPlayer
					src={toPlayableVideoUrl(videoLink)}
					playing={playing}
					controls
					width="100%"
					height="100%"
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
					onEnded={() => {
						setPlaying(false);
						setShowVideo(false);
					}}
				/>
			</div>
		);
	}

	return (
		<div className={`${styles.cover} ${className ?? ""}`}>
			{coverImage && (
				<Image
					src={coverImage}
					alt={alt || "Project cover"}
					fill
					style={{ objectFit: "cover" }}
				/>
			)}
			{children}
			{videoLink &&
				(renderPlay ? (
					renderPlay(play)
				) : (
					<button
						type="button"
						className={styles.playButton}
						onClick={play}
						aria-label="Play video"
					>
						<IconPlayerPlayFilled size={22} />
					</button>
				))}
			{duration && <span className={styles.duration}>{duration}</span>}
		</div>
	);
}
