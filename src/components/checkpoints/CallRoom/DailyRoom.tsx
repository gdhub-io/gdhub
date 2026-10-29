"use client";

import {
	DailyAudio,
	DailyProvider,
	DailyVideo,
	type StatefulDevice,
	useActiveSpeakerId,
	useAudioLevelObserver,
	useCallObject,
	useDaily,
	useDailyEvent,
	useDevices,
	useLocalSessionId,
	useMeetingState,
	useParticipantIds,
	useParticipantProperty,
	useRecording,
	useScreenShare,
} from "@daily-co/daily-react";
import { useTranslate } from "@tolgee/react";
import { App, Skeleton } from "antd";
import { useSession } from "next-auth/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	CuratorAside,
	teamProject,
} from "@/components/checkpoints/CuratorReview/CuratorAside";
import { trackCheckpoint } from "@/helpers/gtm";
import {
	isCallRefusal,
	useEndCall,
	useJoinCall,
} from "@/hooks/checkpoint-call";
import type { CheckpointCallDto } from "@/types/checkpoint-call";
import { CallHeader, type CallHeaderProps, callTime } from "./CallHeader";
import { CallLayout, CallStage, LiveStage, ParticipantTile } from "./CallParts";
import { CallTeam } from "./CallTeam";
import { type CallDevices, PreJoin } from "./PreJoin";
import styles from "./style.module.scss";
import { playTestTone } from "./tone";

const LEVEL_INTERVAL_MS = 100;

type TrackState = string | undefined;
const isOn = (state: TrackState) =>
	!!state && state !== "off" && state !== "blocked";

export type OpenCallProps = {
	call: CheckpointCallDto;
	header: Omit<CallHeaderProps, "call" | "joined" | "onLeave" | "onEnd">;
	onJoinedChange: (joined: boolean) => void;
	refetch: () => void;
	/** Under the stage in every state of the room. */
	below?: ReactNode;
};

/** The open room: one Daily call object for the page, from preview to leaving. */
export function OpenCall(props: OpenCallProps) {
	const callObject = useCallObject({});

	return (
		<DailyProvider callObject={callObject}>
			<Room {...props} />
		</DailyProvider>
	);
}

function Room({ call, header, onJoinedChange, refetch, below }: OpenCallProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const daily = useDaily();
	const meetingState = useMeetingState();
	const joined = meetingState === "joined-meeting";
	const join = useJoinCall(call.checkpointId, call.index);
	const end = useEndCall(call.checkpointId, call.index);

	useEffect(() => onJoinedChange(joined), [joined, onJoinedChange]);

	useEffect(() => {
		daily?.startCamera().catch(() => undefined);
	}, [daily]);

	// Ended for everyone, expired or dropped: the server says which.
	const reload = useCallback(() => refetch(), [refetch]);
	useDailyEvent("left-meeting", reload);
	useDailyEvent("error", reload);

	const joinFailed = () =>
		message.error(t("checkpoints.call.joinFailed", "Could not join the call"));

	const onJoin = () =>
		join.mutate(undefined, {
			onSuccess: ({ url, token }) =>
				daily
					?.join({ url, token })
					.then(() =>
						trackCheckpoint(
							"checkpoint_call_joined",
							{ session_index: call.index, role: call.role },
							{ once: `call_joined:${call.checkpointId}:${call.index}` },
						),
					)
					.catch(joinFailed),
			// The curator left before we asked, or the window shut: show what is true now.
			onError: (error) => (isCallRefusal(error) ? refetch() : joinFailed()),
		});

	const leave = async () => {
		await daily?.leave();
		daily?.startCamera().catch(() => undefined);
	};

	const endForAll = () =>
		end.mutate(undefined, {
			onSuccess: () => void daily?.leave(),
			onError: () =>
				message.error(
					t("checkpoints.call.endFailed", "The call could not be ended"),
				),
		});

	const headerNode = (
		<CallHeader
			{...header}
			call={call}
			joined={joined}
			onLeave={leave}
			onEnd={call.role === "curator" ? endForAll : undefined}
			ending={end.isPending}
		/>
	);

	if (joined) {
		return (
			<>
				<CallLayout
					header={headerNode}
					stage={<Live call={call} />}
					aside={
						<CuratorAside
							projectId={teamProject(call)}
							checkpointId={call.checkpointId}
						>
							<RoomTeam call={call} />
						</CuratorAside>
					}
					below={below}
				/>
				<DailyAudio />
			</>
		);
	}

	return (
		<CallLayout
			header={headerNode}
			stage={
				<Lobby
					call={call}
					onJoin={onJoin}
					joining={join.isPending || meetingState === "joining-meeting"}
				/>
			}
			aside={
				<CuratorAside
					projectId={teamProject(call)}
					checkpointId={call.checkpointId}
				>
					<CallTeam call={call} />
				</CuratorAside>
			}
			below={below}
		/>
	);
}

function useLocalMedia() {
	const daily = useDaily();
	const localId = useLocalSessionId();
	const [video, audio] = useParticipantProperty(localId, [
		"tracks.video.state",
		"tracks.audio.state",
	]) as [TrackState, TrackState];
	const camOn = isOn(video);
	const micOn = isOn(audio);

	return {
		localId,
		mic: { on: micOn, onToggle: () => daily?.setLocalAudio(!micOn) },
		camera: { on: camOn, onToggle: () => daily?.setLocalVideo(!camOn) },
	};
}

function Lobby({
	call,
	onJoin,
	joining,
}: {
	call: CheckpointCallDto;
	onJoin: () => void;
	joining: boolean;
}) {
	const localId = useLocalSessionId();

	return localId ? (
		<LocalLobby call={call} onJoin={onJoin} joining={joining} />
	) : (
		<CallStage>
			<Skeleton active className={styles.prejoin} />
		</CallStage>
	);
}

function LocalLobby({
	call,
	onJoin,
	joining,
}: {
	call: CheckpointCallDto;
	onJoin: () => void;
	joining: boolean;
}) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const { localId, mic, camera } = useLocalMedia();
	const [level, setLevel] = useState(0);
	const devices = useDevices();

	useAudioLevelObserver(
		localId,
		useCallback((volume: number) => setLevel(volume), []),
		undefined,
		LEVEL_INTERVAL_MS,
	);

	const options = (list: StatefulDevice[]) =>
		list.map(({ device }, index) => ({
			value: device.deviceId,
			label:
				device.label ||
				t("checkpoints.call.deviceUnnamed", "Device {n}", { n: index + 1 }),
		}));

	const callDevices: CallDevices = {
		camera: {
			options: options(devices.cameras),
			value: devices.currentCam?.device.deviceId,
			onChange: (id) => void devices.setCamera(id),
		},
		microphone: {
			options: options(devices.microphones),
			value: devices.currentMic?.device.deviceId,
			onChange: (id) => void devices.setMicrophone(id),
		},
		speaker: {
			options: options(devices.speakers),
			value: devices.currentSpeaker?.device.deviceId,
			onChange: (id) => void devices.setSpeaker(id),
		},
	};

	return (
		<PreJoin
			mode={
				call.role === "curator" || call.curatorJoinedAt ? "ready" : "waiting"
			}
			viewer={call.role}
			curator={call.curator}
			startsAt={callTime(call.scheduledAt)}
			self={{ name: session?.user?.name ?? "", image: session?.user?.image }}
			preview={
				camera.on ? (
					<DailyVideo
						sessionId={localId}
						type="video"
						fit="cover"
						automirror
						className={styles.video}
					/>
				) : undefined
			}
			micOn={mic.on}
			camOn={camera.on}
			onToggleMic={mic.onToggle}
			onToggleCam={camera.onToggle}
			devices={callDevices}
			micLevel={mic.on ? level : 0}
			onTestSound={() =>
				void playTestTone(devices.currentSpeaker?.device.deviceId).catch(
					() => undefined,
				)
			}
			onJoin={onJoin}
			joining={joining}
		/>
	);
}

function Live({ call }: { call: CheckpointCallDto }) {
	const ids = useParticipantIds({ sort: "joined_at" });
	const activeId = useActiveSpeakerId();
	const { mic, camera } = useLocalMedia();
	const { screens, isSharingScreen, startScreenShare, stopScreenShare } =
		useScreenShare();
	const { isRecording } = useRecording();
	const stageRef = useRef<HTMLDivElement>(null);
	const [fullscreen, setFullscreen] = useState(false);

	useEffect(() => {
		const sync = () =>
			setFullscreen(
				!!stageRef.current && document.fullscreenElement === stageRef.current,
			);
		document.addEventListener("fullscreenchange", sync);
		return () => document.removeEventListener("fullscreenchange", sync);
	}, []);

	const screen = screens[0];

	return (
		<LiveStage
			stageRef={stageRef}
			count={ids.length}
			recording={isRecording}
			mic={mic}
			camera={camera}
			sharing={{
				on: isSharingScreen,
				onToggle: () =>
					isSharingScreen ? stopScreenShare() : startScreenShare(),
			}}
			fullscreen={{
				on: fullscreen,
				onToggle: () =>
					void (fullscreen
						? document.exitFullscreen()
						: stageRef.current?.requestFullscreen()),
			}}
			screen={
				screen && (
					<div className={styles.tile}>
						<DailyVideo
							sessionId={screen.session_id}
							type="screenVideo"
							fit="contain"
							className={styles.video}
						/>
					</div>
				)
			}
		>
			{ids.map((id) => (
				<Tile key={id} id={id} call={call} speaking={id === activeId} />
			))}
		</LiveStage>
	);
}

function useParticipant(id: string, call: CheckpointCallDto) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [name, userId, local, video, audio] = useParticipantProperty(id, [
		"user_name",
		"user_id",
		"local",
		"tracks.video.state",
		"tracks.audio.state",
	]) as [string, string, boolean, TrackState, TrackState];
	const curator = userId === call.curator.id;

	let image: string | null | undefined = null;
	if (curator) image = call.curator.image;
	else if (local) image = session?.user?.image;

	return {
		name,
		local,
		video,
		audio,
		image,
		role: curator ? t("checkpoints.call.curator", "Curator") : undefined,
	};
}

function Tile({
	id,
	call,
	speaking,
}: {
	id: string;
	call: CheckpointCallDto;
	speaking: boolean;
}) {
	const person = useParticipant(id, call);

	return (
		<ParticipantTile
			name={person.name}
			role={person.role}
			muted={!isOn(person.audio)}
			speaking={speaking}
			image={person.image}
			video={
				isOn(person.video) ? (
					<DailyVideo
						sessionId={id}
						type="video"
						fit="cover"
						automirror
						className={styles.video}
					/>
				) : undefined
			}
		/>
	);
}

/** In the room, Daily already knows who is in it, live; the server is not asked. */
function RoomTeam({ call }: { call: CheckpointCallDto }) {
	const daily = useDaily();
	// Subscribes to joins and leaves; the user ids are read from Daily as they stand.
	useParticipantIds();
	const inRoom = Object.values(daily?.participants() ?? {}).flatMap(
		(participant) => (participant.user_id ? [participant.user_id] : []),
	);

	return <CallTeam call={call} inRoom={inRoom} />;
}
