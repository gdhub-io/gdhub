"use client";

import type {
	DailyEventObjectAppMessage,
	DailyParticipant,
} from "@daily-co/daily-js";
import {
	useActiveSpeakerId,
	useAppMessage,
	useDaily,
	useDailyEvent,
	useLiveStreaming,
	useMeetingSessionState,
} from "@daily-co/daily-react";
import { IconMicrophone } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { isOn } from "@/components/checkpoints/CallRoom/call-media";
import { getWorkDirection } from "@/components/DirectionBadge/directions";
import { SBORKA_STREAM } from "@/config/live";
import {
	EMPTY_DIRECTION,
	peopleInOrder,
	type SborkaDirection,
	type SborkaPerson,
	sourcesOnAir,
	streamStartLayout,
	streamUpdateLayout,
} from "@/lib/live/sborka";

/** What a guest carries in Daily's `userData`. */
export type StudioUserData = { role?: string; direction?: string };

export type StudioPerson = {
	id: string;
	name: string;
	role: string;
	/** Direction slug from the speciality; `host` for the show's host. */
	direction: string;
	host: boolean;
	local: boolean;
	audio: boolean;
	video: boolean;
	sharing: boolean;
};

type EditMessage = { type: "sborka:edit"; name: string; role: string };

const toPerson = (p: DailyParticipant): StudioPerson => {
	const data = (p.userData ?? {}) as StudioUserData;
	return {
		id: p.session_id,
		name: p.user_name,
		role: data.role ?? "",
		direction: p.owner ? "host" : (data.direction ?? "other"),
		host: p.owner,
		local: p.local,
		audio: isOn(p.tracks.audio.state),
		video: isOn(p.tracks.video.state),
		sharing: isOn(p.tracks.screenVideo.state),
	};
};

/** Everyone in the room, refreshed on every Daily participant event. */
const usePeople = () => {
	const daily = useDaily();
	const [people, setPeople] = useState<StudioPerson[]>([]);
	const refresh = useCallback(() => {
		if (!daily) return;
		setPeople(Object.values(daily.participants()).map(toPerson));
	}, [daily]);
	useDailyEvent("joined-meeting", refresh);
	useDailyEvent("participant-joined", refresh);
	useDailyEvent("participant-updated", refresh);
	useDailyEvent("participant-left", refresh);
	useEffect(() => refresh(), [refresh]);
	return people;
};

type BroadcastTarget = { rtmpUrl: string; streamKey: string };

/**
 * The studio as one object: who is in the room, what the host has decided, and
 * the host's actions. Guests get the same data and simply never call them.
 */
export const useStudio = () => {
	const daily = useDaily();
	const present = usePeople();
	const speakerId = useActiveSpeakerId();
	const { data } = useMeetingSessionState<SborkaDirection | undefined>();
	const direction = data?.order ? data : EMPTY_DIRECTION;

	const me = present.find((p) => p.local);
	const isHost = !!me?.host;

	const ids = present.map((p) => p.id);
	const ordered = peopleInOrder(direction.order, ids)
		.map((id) => present.find((p) => p.id === id))
		.filter((p): p is StudioPerson => !!p);
	const sharing = present.filter((p) => p.sharing).map((p) => p.id);
	const onAir = sourcesOnAir(direction, ids, sharing);

	const decide = (change: Partial<SborkaDirection>) =>
		daily?.setMeetingSessionData(
			{ ...direction, order: ordered.map((p) => p.id), ...change },
			"replace",
		);

	const toggleOnScreen = (key: string) =>
		decide({
			onScreen: direction.onScreen.includes(key)
				? direction.onScreen.filter((k) => k !== key)
				: [...direction.onScreen, key],
		});

	const reorder = (order: string[]) => decide({ order });
	const setTitle = (title: string) => decide({ title });

	const setMic = (id: string, on: boolean) =>
		daily?.updateParticipant(id, { setAudio: on });

	const applyOwnEdit = useCallback(
		(name: string, role: string) => {
			if (!daily) return;
			daily.setUserName(name);
			const current = (daily.participants().local.userData ??
				{}) as StudioUserData;
			daily.setUserData({ ...current, role });
		},
		[daily],
	);

	const sendAppMessage = useAppMessage<EditMessage>({
		// Only the room's owner may rename someone else.
		onAppMessage: useCallback(
			(event: DailyEventObjectAppMessage<EditMessage>) => {
				const from = daily?.participants()[event.fromId];
				if (event.data?.type !== "sborka:edit" || !from?.owner) return;
				applyOwnEdit(event.data.name, event.data.role);
			},
			[daily, applyOwnEdit],
		),
	});

	const edit = (id: string, name: string, role: string) =>
		id === me?.id
			? applyOwnEdit(name, role)
			: sendAppMessage({ type: "sborka:edit", name, role }, id);

	const people: Record<string, SborkaPerson> = Object.fromEntries(
		present.map((p) => [
			p.id,
			{ name: p.name, role: p.role, direction: p.direction },
		]),
	);

	const broadcast = useLiveStreaming();
	const layoutInput = { sources: onAir, people, title: direction.title };
	const layoutKey = JSON.stringify(layoutInput);

	const startBroadcast = ({ rtmpUrl, streamKey }: BroadcastTarget) =>
		broadcast.startLiveStreaming({
			rtmpUrl: `${rtmpUrl.replace(/\/$/, "")}/${streamKey}`,
			...SBORKA_STREAM,
			layout: streamStartLayout({
				...layoutInput,
				origin: window.location.origin,
			}),
		});

	// Whatever the host changes reaches the broadcast while it runs.
	// biome-ignore lint/correctness/useExhaustiveDependencies: layoutKey stands for layoutInput
	useEffect(() => {
		if (!isHost || !broadcast.isLiveStreaming) return;
		broadcast.updateLiveStreaming({ layout: streamUpdateLayout(layoutInput) });
	}, [isHost, broadcast.isLiveStreaming, layoutKey]);

	return {
		me,
		people: ordered,
		direction,
		onAir,
		speakerId,
		broadcast: {
			live: broadcast.isLiveStreaming,
			error: broadcast.errorMsg,
			start: startBroadcast,
			stop: () => broadcast.stopLiveStreaming(),
		},
		actions: { toggleOnScreen, reorder, setTitle, setMic, edit },
	};
};

export const roleIcon = (direction: string) =>
	direction === "host" ? IconMicrophone : getWorkDirection(direction).icon;
