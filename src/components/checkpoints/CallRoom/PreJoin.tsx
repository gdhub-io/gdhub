"use client";

import {
	IconMicrophone,
	IconPlayerPlay,
	IconVideo,
	IconVolume,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	ConfigProvider,
	Progress,
	Select,
	type ThemeConfig,
	Typography,
} from "antd";
import type { ReactNode } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { neutral, roles, semantic } from "@/config/design";
import { firstName } from "./CallHeader";
import { CallStage, CameraToggle, initials, MicToggle } from "./CallParts";
import styles from "./style.module.scss";

/** Steps in the microphone meter, as frame 08.1 draws them. */
const LEVEL_STEPS = 16;

// The stage is dark, so the button that commits is the light one (frame 08.2).
const joinTheme: ThemeConfig = {
	components: {
		Button: {
			colorPrimary: roles.inverse.surfaceInverse,
			colorPrimaryHover: neutral[100],
			colorPrimaryActive: neutral[200],
			primaryColor: roles.inverse.textInverse,
		},
	},
};

export type DeviceKind = "camera" | "microphone" | "speaker";

export type CallDevices = Record<
	DeviceKind,
	{
		options: { value: string; label: string }[];
		value?: string;
		onChange: (deviceId: string) => void;
	}
>;

export type PreJoinProps = {
	/** "waiting": the team, before the curator has opened the call. */
	mode: "waiting" | "ready";
	viewer: "curator" | "team";
	curator: { name: string; image: string | null };
	/** Already formatted: "14:00". */
	startsAt: string;
	self: { name: string; image?: string | null };
	/** Your own camera; without one the preview shows your initials. */
	preview?: ReactNode;
	micOn: boolean;
	camOn: boolean;
	onToggleMic: () => void;
	onToggleCam: () => void;
	devices: CallDevices;
	/** 0 to 1. */
	micLevel: number;
	onTestSound: () => void;
	onJoin: () => void;
	joining?: boolean;
};

const deviceIcons: Record<DeviceKind, ReactNode> = {
	camera: <IconVideo size={16} />,
	microphone: <IconMicrophone size={16} />,
	speaker: <IconVolume size={16} />,
};

/** Frames 08.1 and 08.2: your own preview and the devices, before joining. */
export function PreJoin({
	mode,
	viewer,
	curator,
	startsAt,
	self,
	preview,
	micOn,
	camOn,
	onToggleMic,
	onToggleCam,
	devices,
	micLevel,
	onTestSound,
	onJoin,
	joining,
}: PreJoinProps) {
	const { t } = useTranslate();
	const curatorName = firstName(curator.name);
	// Speech sits low on Daily's scale; the root lifts it into the meter's range.
	const lit = Math.min(1, Math.sqrt(micLevel)) * 100;

	const deviceLabels: Record<DeviceKind, string> = {
		camera: t("checkpoints.call.camera", "Camera"),
		microphone: t("checkpoints.call.microphone", "Microphone"),
		speaker: t("checkpoints.call.speakers", "Speakers"),
	};

	const field = (kind: DeviceKind, extra?: ReactNode) => (
		<div className={styles.field}>
			<Typography.Text type="secondary" className={styles.small}>
				{deviceLabels[kind]}
			</Typography.Text>
			<Select
				aria-label={deviceLabels[kind]}
				prefix={deviceIcons[kind]}
				options={devices[kind].options}
				value={devices[kind].value}
				onChange={devices[kind].onChange}
				disabled={!devices[kind].options.length}
			/>
			{extra}
		</div>
	);

	return (
		<CallStage>
			<div className={styles.prejoin}>
				<div className={styles.preview}>
					{preview ?? (
						<div className={styles.centre}>
							<AppAvatar src={self.image} size={64} className={styles.initials}>
								{initials(self.name)}
							</AppAvatar>
						</div>
					)}
					<div className={styles.overlay}>
						<span className={styles.nameTag}>
							{t("checkpoints.call.you", "{name} (you)", { name: self.name })}
						</span>
					</div>
					<div className={styles.toggles}>
						<MicToggle on={micOn} onToggle={onToggleMic} />
						<CameraToggle on={camOn} onToggle={onToggleCam} />
					</div>
				</div>

				<div className={styles.ready}>
					{mode === "waiting" ? (
						<div className={styles.waitingHead}>
							<span className={styles.ring}>
								<AppAvatar src={curator.image} size={48}>
									{initials(curator.name)}
								</AppAvatar>
							</span>
							<div className={styles.headText}>
								<Typography.Text className={styles.headTitle}>
									{t(
										"checkpoints.call.waitingTitle",
										"Waiting for {name} to open the call",
										{ name: curatorName },
									)}
								</Typography.Text>
								<Typography.Text type="secondary" className={styles.small}>
									{t(
										"checkpoints.call.waitingText",
										"Starts at {time}. You'll be let in as soon as they join.",
										{ time: startsAt },
									)}
								</Typography.Text>
							</div>
						</div>
					) : (
						<div className={styles.headText}>
							<Typography.Title level={3} className={styles.title}>
								{t("checkpoints.call.readyTitle", "Ready to join?")}
							</Typography.Title>
							{viewer === "team" ? (
								<div className={styles.whoIsIn}>
									<AppAvatar src={curator.image} size={24}>
										{initials(curator.name)}
									</AppAvatar>
									<Typography.Text type="secondary">
										{t("checkpoints.call.curatorIn", "{name} is in the call", {
											name: curatorName,
										})}
									</Typography.Text>
								</div>
							) : (
								<Typography.Text type="secondary">
									{t(
										"checkpoints.call.teamWaits",
										"The team is let in once you join",
									)}
								</Typography.Text>
							)}
						</div>
					)}

					{field("camera")}
					{field(
						"microphone",
						<Progress
							percent={lit}
							steps={LEVEL_STEPS}
							size={[12, 4]}
							showInfo={false}
							strokeColor={semantic.success.solid}
							railColor={roles.inverse.borderStrong}
						/>,
					)}
					{field(
						"speaker",
						<Button
							type="text"
							size="small"
							className={styles.testSound}
							icon={<IconPlayerPlay size={14} />}
							onClick={onTestSound}
						>
							{t("checkpoints.call.testSound", "Play a test sound")}
						</Button>,
					)}

					<Typography.Text type="secondary" className={styles.small}>
						{t(
							"checkpoints.call.recordedNotice",
							"The call is recorded for the notes",
						)}
					</Typography.Text>

					{mode === "waiting" ? (
						<Button block size="large" loading disabled>
							{t("checkpoints.call.waitingButton", "Waiting for {name}…", {
								name: curatorName,
							})}
						</Button>
					) : (
						<ConfigProvider theme={joinTheme}>
							<Button
								type="primary"
								block
								size="large"
								icon={<IconVideo size={20} />}
								loading={joining}
								onClick={onJoin}
							>
								{t("checkpoints.call.join", "Join call")}
							</Button>
						</ConfigProvider>
					)}
				</div>
			</div>
		</CallStage>
	);
}
