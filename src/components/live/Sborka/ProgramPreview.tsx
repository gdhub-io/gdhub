"use client";

// ui-guard: off the broadcast picture is bespoke art (frames 03.15.15–20), drawn to match Daily's VCS output, not app UI.
import { DailyVideo } from "@daily-co/daily-react";
import type { CSSProperties } from "react";
import {
	BROADCAST,
	type Frame,
	RAIL_PALETTE,
	showsSpeakerFrame,
	tileFrames,
} from "@/lib/live/sborka";
import styles from "./program.module.scss";
import { roleIcon, type StudioPerson } from "./use-studio";

const at = (f: Frame) =>
	({ "--x": f.x, "--y": f.y, "--w": f.w, "--h": f.h }) as CSSProperties;

type Props = {
	title: string;
	/** Source keys on air, in order: `<sessionId>` or `<sessionId>:screen`. */
	sources: string[];
	people: StudioPerson[];
	speakerId: string | null;
};

/** The broadcast as Daily will draw it, for the host to watch while directing. */
export function ProgramPreview({ title, sources, people, speakerId }: Props) {
	const byId = new Map(people.map((p) => [p.id, p]));
	const cameras = sources.filter((key) => !key.includes(":"));
	const share = sources.find((key) => key.endsWith(":screen"));
	const frames = tileFrames(cameras.length, !!share);
	const speaker = speakerId ? byId.get(speakerId) : undefined;
	const speakerOnAir = !!speakerId && cameras.includes(speakerId);
	const speakerFrame =
		speakerOnAir && showsSpeakerFrame(cameras.length)
			? frames.cameras[cameras.indexOf(speakerId)]
			: null;
	const sharing = !!share;

	const tile = (key: string, frame: Frame, screen: boolean) => {
		const id = key.split(":")[0];
		const person = byId.get(id);
		const label = screen
			? `${person?.name ?? ""} показывает экран`
			: [person?.name, person?.role].filter(Boolean).join(" · ");
		const hasVideo = screen || person?.video;
		return (
			<div
				key={key}
				className={`${styles.box} ${styles.tile}`}
				style={at(frame)}
			>
				{hasVideo ? (
					<DailyVideo
						sessionId={id}
						type={screen ? "screenVideo" : "video"}
						fit={screen ? "contain" : "cover"}
						className={styles.video}
						data-screen={screen}
					/>
				) : (
					<div className={styles.initials}>
						{(person?.name ?? "?").trim().charAt(0).toUpperCase()}
					</div>
				)}
				{label && (
					<div className={styles.label} data-small={sharing && !screen}>
						{label}
					</div>
				)}
			</div>
		);
	};

	const tint = speaker ? RAIL_PALETTE[speaker.direction]?.[0] : undefined;
	const handle = sharing ? 12 : 20;

	return (
		<div className={styles.program}>
			<div className={styles.frame}>
				<div
					className={`${styles.box} ${styles.grid}`}
					style={at({ x: 0, y: BROADCAST.header, w: 1920, h: 996 })}
				/>
				{share && frames.share && tile(share, frames.share, true)}
				{cameras.map((key, i) => tile(key, frames.cameras[i], false))}
				{speakerFrame && (
					<div
						className={`${styles.box} ${styles.speaker}`}
						style={
							{
								...at(speakerFrame),
								"--tint": tint,
								"--stroke": sharing ? 3 : 5,
								"--m": handle,
							} as CSSProperties
						}
					>
						{[
							[0, 0],
							[1, 0],
							[0, 1],
							[1, 1],
						].map(([x, y]) => (
							<span
								key={`${x}${y}`}
								className={styles.handle}
								style={{
									left: `calc(${x * 100}% - ${handle / 2} * var(--p))`,
									top: `calc(${y * 100}% - ${handle / 2} * var(--p))`,
								}}
							/>
						))}
					</div>
				)}
				<div
					className={`${styles.box} ${styles.rail}`}
					style={at(BROADCAST.rail)}
				>
					{Object.entries(RAIL_PALETTE).map(([slug, [railTint, vivid]]) => {
						const Icon = roleIcon(slug);
						const on = speakerOnAir && speaker?.direction === slug;
						return (
							<span
								key={slug}
								className={styles.railItem}
								data-on={on}
								style={
									{ "--tint": railTint, "--vivid": vivid } as CSSProperties
								}
							>
								<Icon size="60%" />
							</span>
						);
					})}
				</div>
				<div
					className={`${styles.box} ${styles.header}`}
					style={at({ x: 0, y: 0, w: 1920, h: BROADCAST.header })}
				>
					<span className={styles.title}>{title}</span>
				</div>
				{/* biome-ignore lint/performance/noImgElement: a fixed-size broadcast logo, not content imagery */}
				<img
					src="/vcs/sborka/sborka-logo.png"
					alt="Сборка"
					className={styles.box}
					style={at({ x: 32, y: 11, w: 186, h: 62 })}
				/>
				{/* biome-ignore lint/performance/noImgElement: a fixed-size broadcast logo, not content imagery */}
				<img
					src="/vcs/sborka/gdhub-logo.png"
					alt="GDHub"
					className={styles.box}
					style={at({ x: 1718, y: 18, w: 170, h: 47 })}
				/>
			</div>
		</div>
	);
}
