"use client";

import {
	useDaily,
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import { useEffect, useRef, useState } from "react";

type TrackState = string | undefined;

/** A Daily track counts as on unless it is off or blocked. */
export const isOn = (state: TrackState) =>
	!!state && state !== "off" && state !== "blocked";

/** Your own mic and camera, as toggles for `LiveStage` and the pre-join preview. */
export function useLocalMedia() {
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

/** The stage's full-screen toggle, kept in step when Esc leaves full screen. */
export function useStageFullscreen() {
	const stageRef = useRef<HTMLDivElement>(null);
	const [on, setOn] = useState(false);

	useEffect(() => {
		const sync = () =>
			setOn(
				!!stageRef.current && document.fullscreenElement === stageRef.current,
			);
		document.addEventListener("fullscreenchange", sync);
		return () => document.removeEventListener("fullscreenchange", sync);
	}, []);

	return {
		stageRef,
		fullscreen: {
			on,
			onToggle: () =>
				void (on
					? document.exitFullscreen()
					: stageRef.current?.requestFullscreen()),
		},
	};
}

/** "24:18" or "1:02:05" since `since`, ticking each second in the caller only. */
export function useClock(since: number | string) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	const start = typeof since === "string" ? Date.parse(since) : since;
	const seconds = Math.max(0, Math.floor((now - start) / 1000));
	const pad = (n: number) => String(n).padStart(2, "0");
	const hours = Math.floor(seconds / 3600);
	const clock = `${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
	return hours ? `${hours}:${clock}` : clock;
}
