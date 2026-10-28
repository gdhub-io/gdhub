"use client";

import {
	IconMaximize,
	IconMicrophone,
	IconMicrophoneOff,
	IconMinimize,
	IconScreenShare,
	IconScreenShareOff,
	IconVideo,
	IconVideoOff,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import type { CSSProperties, ReactNode, Ref } from "react";
import { InverseBand, StatusDot } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import styles from "./style.module.scss";

export const initials = (name: string) =>
	name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");

/**
 * The header over the stage and, beside it once in the call, the people.
 * `below` follows the stage in the main column: the goal and the call panel.
 */
export function CallLayout({
	header,
	stage,
	aside,
	below,
}: {
	header: ReactNode;
	stage: ReactNode;
	aside?: ReactNode;
	below?: ReactNode;
}) {
	const main = (
		<div className={styles.main}>
			{stage}
			{below}
		</div>
	);

	return (
		<div className={styles.page}>
			{header}
			{aside ? (
				<div className={styles.split}>
					{main}
					{aside}
				</div>
			) : (
				main
			)}
		</div>
	);
}

/** A video surface, dark in either theme. */
export function CallStage({
	children,
	stageRef,
}: {
	children: ReactNode;
	stageRef?: Ref<HTMLDivElement>;
}) {
	return (
		<InverseBand density="product" transparent className={styles.stage}>
			<div ref={stageRef} className={styles.stageInner}>
				{children}
			</div>
		</InverseBand>
	);
}

type ToggleProps = {
	on: boolean;
	onToggle: () => void;
};

export function MicToggle({ on, onToggle }: ToggleProps) {
	const { t } = useTranslate();
	const label = on
		? t("checkpoints.call.micOff", "Turn off microphone")
		: t("checkpoints.call.micOn", "Turn on microphone");
	return (
		<Tooltip title={label}>
			<Button
				shape="circle"
				size="large"
				danger={!on}
				aria-label={label}
				icon={
					on ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />
				}
				onClick={onToggle}
			/>
		</Tooltip>
	);
}

export function CameraToggle({ on, onToggle }: ToggleProps) {
	const { t } = useTranslate();
	const label = on
		? t("checkpoints.call.camOff", "Turn off camera")
		: t("checkpoints.call.camOn", "Turn on camera");
	return (
		<Tooltip title={label}>
			<Button
				shape="circle"
				size="large"
				danger={!on}
				aria-label={label}
				icon={on ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
				onClick={onToggle}
			/>
		</Tooltip>
	);
}

export type ParticipantTileProps = {
	name: string;
	/** Already-translated, appended after the name: "· Curator". */
	role?: string;
	muted: boolean;
	speaking: boolean;
	/** The participant's video; without one the tile shows their initials. */
	video?: ReactNode;
	image?: string | null;
};

/** Frame 08.3 tile: video or initials, the name and the mic on a dark tag. */
export function ParticipantTile({
	name,
	role,
	muted,
	speaking,
	video,
	image,
}: ParticipantTileProps) {
	return (
		<div className={styles.tile} data-speaking={speaking}>
			{video ?? (
				<div className={styles.centre}>
					<AppAvatar src={image} size={64} className={styles.initials}>
						{initials(name)}
					</AppAvatar>
				</div>
			)}
			<div className={styles.overlay}>
				<span className={styles.nameTag}>
					{muted ? (
						<IconMicrophoneOff size={14} className={styles.muted} />
					) : (
						<IconMicrophone size={14} />
					)}
					{role ? `${name} · ${role}` : name}
				</span>
			</div>
		</div>
	);
}

export type LiveStageProps = {
	children: ReactNode;
	/** A shared screen spans the grid above the people. */
	screen?: ReactNode;
	count: number;
	recording: boolean;
	mic: ToggleProps;
	camera: ToggleProps;
	sharing: ToggleProps;
	fullscreen: ToggleProps;
	stageRef?: Ref<HTMLDivElement>;
};

const columnsFor = (count: number) => {
	if (count <= 1) return 1;
	if (count <= 4) return 2;
	if (count <= 9) return 3;
	return 4;
};

/** Frame 08.3: the people in the call and the bar that controls your side. */
export function LiveStage({
	children,
	screen,
	count,
	recording,
	mic,
	camera,
	sharing,
	fullscreen,
	stageRef,
}: LiveStageProps) {
	const { t } = useTranslate();
	const shareLabel = sharing.on
		? t("checkpoints.call.shareStop", "Stop sharing")
		: t("checkpoints.call.share", "Share screen");
	const fullscreenLabel = fullscreen.on
		? t("checkpoints.call.fullscreenExit", "Exit full screen")
		: t("checkpoints.call.fullscreen", "Full screen");

	return (
		<CallStage stageRef={stageRef}>
			<div className={styles.live}>
				<div
					className={styles.grid}
					style={{ "--call-columns": columnsFor(count) } as CSSProperties}
				>
					{screen && <div className={styles.screen}>{screen}</div>}
					{children}
				</div>
				<div className={styles.controls}>
					<span>
						{recording && (
							<StatusDot
								tone="danger"
								className={styles.recording}
								label={t("checkpoints.call.recording", "Recording")}
							/>
						)}
					</span>
					<div className={styles.buttons}>
						<MicToggle {...mic} />
						<CameraToggle {...camera} />
						<Tooltip title={shareLabel}>
							<Button
								shape="circle"
								size="large"
								aria-label={shareLabel}
								icon={
									sharing.on ? (
										<IconScreenShareOff size={20} />
									) : (
										<IconScreenShare size={20} />
									)
								}
								onClick={sharing.onToggle}
							/>
						</Tooltip>
					</div>
					<Tooltip title={fullscreenLabel}>
						<Button
							shape="circle"
							size="large"
							className={styles.end}
							aria-label={fullscreenLabel}
							icon={
								fullscreen.on ? (
									<IconMinimize size={20} />
								) : (
									<IconMaximize size={20} />
								)
							}
							onClick={fullscreen.onToggle}
						/>
					</Tooltip>
				</div>
			</div>
		</CallStage>
	);
}

export type CallPerson = {
	name: string;
	image?: string | null;
	/** Already-translated: "Curator", "You". */
	role?: string;
};

/** Sidebar `zatOL`, cut to who is in the call. */
export function CallTeamPanel({
	count,
	children,
}: {
	count: number;
	children: ReactNode;
}) {
	const { t } = useTranslate();

	return (
		<section className={styles.team}>
			<div className={styles.teamHead}>
				<Typography.Text className={styles.teamTitle}>
					{t("checkpoints.call.team", "Team")}
				</Typography.Text>
				<Typography.Text type="secondary" className={styles.small}>
					{t("checkpoints.call.inCallCount", "{count} in the call", { count })}
				</Typography.Text>
			</div>
			{children}
		</section>
	);
}

export function CallPersonRow({
	name,
	image,
	role,
	inCall = true,
}: CallPerson & { inCall?: boolean }) {
	const { t } = useTranslate();

	return (
		<div className={styles.member}>
			<AppAvatar src={image} size={32}>
				{initials(name)}
			</AppAvatar>
			<div className={styles.memberText}>
				<Typography.Text ellipsis className={styles.memberName}>
					{name}
				</Typography.Text>
				{role && (
					<Typography.Text type="secondary" className={styles.small}>
						{role}
					</Typography.Text>
				)}
			</div>
			{inCall ? (
				<StatusDot
					tone="success"
					label={t("checkpoints.call.inCall", "In the call")}
				/>
			) : (
				<StatusDot tone="neutral" label={t("checkpoints.call.away", "Away")} />
			)}
		</div>
	);
}
