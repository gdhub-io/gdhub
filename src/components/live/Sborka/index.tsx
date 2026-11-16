"use client";

import {
	DailyAudio,
	DailyProvider,
	DailyVideo,
	useCallObject,
	useDaily,
	useDailyEvent,
	useMeetingState,
	useScreenShare,
} from "@daily-co/daily-react";
import {
	IconBroadcast,
	IconDoorExit,
	IconHourglass,
	IconLock,
	IconPlayerStop,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Button,
	Flex,
	Form,
	Input,
	Skeleton,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CallStage,
	CameraToggle,
	LiveStage,
	MicToggle,
	ParticipantTile,
} from "@/components/checkpoints/CallRoom/CallParts";
import {
	useClock,
	useLocalMedia,
	useStageFullscreen,
} from "@/components/checkpoints/CallRoom/call-media";
import { getWorkDirection } from "@/components/DirectionBadge/directions";
import { StatusDot } from "@/components/ui";
import {
	closeSborkaOnExit,
	useCloseSborka,
	useOpenSborka,
	useReportHostLeft,
	useSborkaSeat,
	useSborkaState,
} from "@/hooks/live";
import type { SborkaStateDto } from "@/types/live";
import {
	BroadcastSettings,
	type BroadcastSettingsValues,
} from "./BroadcastSettings";
import { PeoplePanel } from "./PeoplePanel";
import { ProgramPreview } from "./ProgramPreview";
import styles from "./style.module.scss";
import { roleIcon, type StudioUserData, useStudio } from "./use-studio";

/** `/live/room/sborka`: the Sborka studio, frames 03.15.1–14. */
export function SborkaStudio() {
	const callObject = useCallObject({});
	return (
		<DailyProvider callObject={callObject}>
			<Studio />
		</DailyProvider>
	);
}

function Studio() {
	const meetingState = useMeetingState();
	const joined = meetingState === "joined-meeting";
	const [ended, setEnded] = useState(false);
	const state = useSborkaState({ poll: !joined && !ended });

	useDailyEvent(
		"left-meeting",
		useCallback(() => setEnded(true), []),
	);

	if (!state.data) return <Skeleton active paragraph={{ rows: 12 }} />;
	if (joined)
		return (
			<Room host={state.data.host} canBroadcast={state.data.canBroadcast} />
		);
	if (ended) return <Ended onBack={() => setEnded(false)} />;
	if (!state.data.open && !state.data.host) return <Waiting />;
	return <Join state={state.data} />;
}

function Header({
	status,
	actions,
}: {
	status: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<div className={styles.header}>
			<div className={styles.titles}>
				<div className={styles.titleRow}>
					<Typography.Title level={3} className={styles.title}>
						Sborka
					</Typography.Title>
					{status}
				</div>
			</div>
			<Flex gap={12}>{actions}</Flex>
		</div>
	);
}

/** Frame 03.15.9: the host has not opened the room yet; the page asks again by itself. */
function Waiting() {
	const { t } = useTranslate();
	return (
		<div className={styles.page}>
			<Header
				status={
					<Tag>{t("live.sborka.waitingTag", "Waiting for the host")}</Tag>
				}
			/>
			<CallStage>
				<div className={styles.centre}>
					<IconHourglass size={32} />
					<Typography.Title level={4}>
						{t("live.sborka.waitingTitle", "Waiting for the host")}
					</Typography.Title>
					<Typography.Text type="secondary">
						{t(
							"live.sborka.waitingText",
							"This page opens the room by itself once the host is in.",
						)}
					</Typography.Text>
				</div>
			</CallStage>
		</div>
	);
}

/** Frame 03.15.12. */
function Ended({ onBack }: { onBack: () => void }) {
	const { t } = useTranslate();
	return (
		<div className={styles.page}>
			<Header status={<Tag>{t("live.sborka.endedTag", "Room closed")}</Tag>} />
			<CallStage>
				<div className={styles.centre}>
					<Typography.Title level={4}>
						{t("live.sborka.endedTitle", "The room is closed")}
					</Typography.Title>
					<Typography.Text type="secondary">
						{t("live.sborka.endedText", "Thanks for taking part.")}
					</Typography.Text>
					<Button onClick={onBack}>{t("live.sborka.back", "Back")}</Button>
				</div>
			</CallStage>
		</div>
	);
}

type JoinValues = { name: string; role: string };

/** Frames 03.15.1 (host, room closed) and 03.15.10 (guest, pre-join). */
function Join({ state }: { state: SborkaStateDto }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const daily = useDaily();
	const { data: session } = useSession();
	const { localId, mic, camera } = useLocalMedia();
	const seat = useSborkaSeat();
	const open = useOpenSborka();
	const [form] = Form.useForm<JoinValues>();
	const direction = state.host
		? "host"
		: getWorkDirection(state.profile.direction ?? "other").slug;
	const Role = roleIcon(direction);

	useEffect(() => {
		daily?.startCamera().catch(() => undefined);
	}, [daily]);

	const join = async ({ name, role }: JoinValues) => {
		try {
			if (state.host && !state.open) await open.mutateAsync();
			const { url, token } = await seat.mutateAsync();
			await daily?.join({
				url,
				token,
				userName: name.trim(),
				userData: { role: role.trim(), direction } satisfies StudioUserData,
			});
		} catch {
			message.error(t("live.sborka.joinFailed", "Could not join the room"));
		}
	};

	const busy = seat.isPending || open.isPending;

	return (
		<div className={styles.page}>
			<Header
				status={
					state.open ? (
						<StatusDot
							tone="success"
							label={t("live.sborka.roomOpen", "The room is open")}
						/>
					) : (
						<Tag>{t("live.sborka.roomClosed", "Room closed")}</Tag>
					)
				}
			/>
			<CallStage>
				<div className={styles.join}>
					<div className={styles.preview}>
						{localId && camera.on && (
							<DailyVideo
								sessionId={localId}
								type="video"
								mirror
								className={styles.previewVideo}
							/>
						)}
						<div className={styles.previewControls}>
							<MicToggle {...mic} />
							<CameraToggle {...camera} />
						</div>
					</div>
					<Form
						form={form}
						layout="vertical"
						variant="filled"
						requiredMark={false}
						initialValues={{
							name: session?.user?.name ?? "",
							role: state.host ? "Host" : state.profile.role,
						}}
						onFinish={join}
						className={styles.joinForm}
					>
						<Form.Item
							name="name"
							label={t("live.sborka.yourName", "Your name in the room")}
							rules={[{ required: true, whitespace: true }]}
						>
							<Input maxLength={60} />
						</Form.Item>
						<Form.Item
							name="role"
							label={t("live.sborka.role", "Role")}
							extra={t(
								"live.sborka.roleDefault",
								"Shown on the broadcast. Defaults to your speciality.",
							)}
							rules={[{ required: true, whitespace: true }]}
						>
							<Input prefix={<Role size={16} />} maxLength={60} />
						</Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							loading={busy}
							block
							size="large"
						>
							{state.host && !state.open
								? t("live.sborka.openRoom", "Open room")
								: t("live.sborka.join", "Join")}
						</Button>
					</Form>
				</div>
			</CallStage>
		</div>
	);
}

/** Mounted when the broadcast starts, so it counts from then and ticks alone. */
function OnAirStatus() {
	const { t } = useTranslate();
	const [since] = useState(Date.now);
	return (
		<StatusDot
			tone="danger"
			label={t("live.sborka.onAir", "On air · {time}", {
				time: useClock(since),
			})}
		/>
	);
}

/** Frames 03.15.2–7 (host) and 03.15.11 (guest). */
function Room({
	host,
	canBroadcast,
}: {
	host: boolean;
	canBroadcast: boolean;
}) {
	const { t } = useTranslate();
	const { message, modal } = App.useApp();
	const daily = useDaily();
	const studio = useStudio();
	const close = useCloseSborka();
	const { mutate: reportHostLeft } = useReportHostLeft();
	const screenShare = useScreenShare();
	const [target, setTarget] = useState<BroadcastSettingsValues>();
	const selfMuted = useRef(false);
	const { stageRef, fullscreen } = useStageFullscreen();

	const { broadcast, actions, direction, me } = studio;

	// The host's tab closing ends the show, as leaving by the button does.
	useEffect(() => {
		if (!host) return;
		window.addEventListener("pagehide", closeSborkaOnExit);
		return () => window.removeEventListener("pagehide", closeSborkaOnExit);
	}, [host]);

	useDailyEvent(
		"participant-left",
		useCallback(
			(event) => {
				if (host || !event.participant.owner || !daily) return;
				// One guest reports, not all of them: the lowest session id left.
				const all = daily.participants();
				const [first] = Object.values(all)
					.filter((p) => !p.owner)
					.map((p) => p.session_id)
					.sort();
				if (first === all.local.session_id) reportHostLeft();
			},
			[host, daily, reportHostLeft],
		),
	);

	useDailyEvent(
		"participant-updated",
		useCallback(
			(event) => {
				const p = event.participant;
				if (!p.local || p.tracks.audio.state !== "off") return;
				if (selfMuted.current) {
					selfMuted.current = false;
					return;
				}
				if (!host)
					message.info(t("live.sborka.mutedByHost", "The host muted you"));
			},
			[host, message, t],
		),
	);

	const leave = () => daily?.leave();

	const endRoom = () =>
		modal.confirm({
			title: t("live.sborka.endConfirmTitle", "End the room for everyone?"),
			content: t(
				"live.sborka.endConfirmText",
				"Everyone is removed from the call and the broadcast stops.",
			),
			okText: t("live.sborka.endRoom", "End room"),
			okButtonProps: { danger: true },
			cancelText: t("live.sborka.cancel", "Cancel"),
			onOk: async () => {
				if (broadcast.live) broadcast.stop();
				await close.mutateAsync();
				await daily?.leave();
			},
		});

	const ready = canBroadcast && !!target?.rtmpUrl && !!target?.streamKey;
	const onScreenMe = !!me && direction.onScreen.includes(me.id);

	const status = broadcast.live ? (
		<OnAirStatus />
	) : (
		<StatusDot
			tone="success"
			label={t("live.sborka.roomOpenOffAir", "Room open · not on air")}
		/>
	);

	const hostActions = (
		<>
			{broadcast.live ? (
				<Button
					type="primary"
					icon={<IconPlayerStop size={16} />}
					onClick={broadcast.stop}
				>
					{t("live.sborka.stopBroadcast", "Stop broadcast")}
				</Button>
			) : (
				<Tooltip
					title={
						ready
							? undefined
							: canBroadcast
								? t(
										"live.sborka.needTarget",
										"Add the RTMP URL and stream key to go live",
									)
								: t(
										"live.sborka.streamingOff",
										"Live streaming is not set up for this environment's Daily domain",
									)
					}
				>
					<Button
						type="primary"
						disabled={!ready}
						icon={ready ? <IconBroadcast size={16} /> : <IconLock size={16} />}
						onClick={() => target && broadcast.start(target)}
					>
						{t("live.sborka.startBroadcast", "Start broadcast")}
					</Button>
				</Tooltip>
			)}
			<Button danger icon={<IconDoorExit size={16} />} onClick={endRoom}>
				{t("live.sborka.endRoom", "End room")}
			</Button>
		</>
	);

	const guestActions = (
		<>
			<Tag color={onScreenMe ? "processing" : undefined}>
				{onScreenMe
					? t("live.sborka.youOnScreen", "You're on screen")
					: t("live.sborka.youOffScreen", "You're off screen")}
			</Tag>
			<Button danger icon={<IconDoorExit size={16} />} onClick={leave}>
				{t("live.sborka.leave", "Leave")}
			</Button>
		</>
	);

	const audio = !!me?.audio;
	const stage = (
		<LiveStage
			count={studio.people.length}
			recording={false}
			screen={
				studio.people
					.filter((p) => p.sharing)
					.map((p) => (
						<ParticipantTile
							key={`${p.id}:screen`}
							name={p.name}
							muted={!p.audio}
							speaking={false}
							video={
								<DailyVideo sessionId={p.id} type="screenVideo" fit="contain" />
							}
						/>
					))[0]
			}
			mic={{
				on: audio,
				onToggle: () => {
					selfMuted.current = audio;
					daily?.setLocalAudio(!audio);
				},
			}}
			camera={{
				on: !!me?.video,
				onToggle: () => daily?.setLocalVideo(!me?.video),
			}}
			sharing={{
				on: screenShare.isSharingScreen && !!me?.sharing,
				onToggle: () =>
					me?.sharing
						? screenShare.stopScreenShare()
						: screenShare.startScreenShare(),
			}}
			stageRef={stageRef}
			fullscreen={fullscreen}
		>
			{studio.people.map((p) => (
				<ParticipantTile
					key={p.id}
					name={p.name}
					role={p.role}
					muted={!p.audio}
					speaking={p.id === studio.speakerId}
					video={
						p.video ? (
							<DailyVideo
								sessionId={p.id}
								type="video"
								fit="cover"
								mirror={p.local}
							/>
						) : undefined
					}
				/>
			))}
		</LiveStage>
	);

	return (
		<div className={styles.page}>
			<Header status={status} actions={host ? hostActions : guestActions} />
			{host && broadcast.error && (
				<Alert
					type="warning"
					showIcon
					closable
					message={t(
						"live.sborka.broadcastFailed",
						"The broadcast didn't start",
					)}
					description={t(
						"live.sborka.broadcastFailedText",
						"The streaming server refused the connection. Check the RTMP URL and stream key, then start again.",
					)}
				/>
			)}
			<div className={styles.split}>
				<div className={styles.main}>
					<Tabs
						destroyOnHidden
						items={[
							{
								key: "original",
								label: t("live.sborka.original", "Original"),
								children: stage,
							},
							{
								key: "preview",
								label: t("live.sborka.preview", "Preview"),
								children: (
									<ProgramPreview
										title={direction.title}
										sources={studio.onAir}
										people={studio.people}
										speakerId={studio.speakerId}
									/>
								),
							},
						]}
					/>

					{host && (
						<BroadcastSettings
							live={broadcast.live}
							onChange={(values) => {
								setTarget(values);
								if (values.title !== direction.title)
									actions.setTitle(values.title);
							}}
						/>
					)}
				</div>
				<PeoplePanel
					people={studio.people}
					onScreen={direction.onScreen}
					host={host}
					actions={actions}
				/>
			</div>
			<DailyAudio />
		</div>
	);
}
