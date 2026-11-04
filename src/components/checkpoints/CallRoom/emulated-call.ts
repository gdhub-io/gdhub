import type { DailyCall } from "@daily-co/daily-js";
import { E2E_STAND } from "@/lib/stand";

/**
 * The browser's call object on the e2e stand (`NEXT_PUBLIC_DAILY_EMULATED`,
 * GDHUB-116): what daily-react reads from a real one — the meeting state, the
 * participants and their events — without WebRTC. Joining and leaving go to the
 * emulated Daily through `/api/dev/daily`; the room is watched there, so the
 * other side appears, and "end for everyone" sends this one out too.
 */
export const DAILY_EMULATED =
	E2E_STAND && process.env.NEXT_PUBLIC_DAILY_EMULATED === "1";

type Listener = (event: Record<string, unknown>) => void;
type Person = { userId: string; userName: string; owner: boolean };

const track = { state: "off", subscribed: true } as const;

const participant = (sessionId: string, person: Person, local: boolean) => ({
	session_id: sessionId,
	user_id: person.userId,
	user_name: person.userName,
	owner: person.owner,
	local,
	joined_at: new Date(),
	audio: false,
	video: false,
	screen: false,
	record: false,
	will_eject_at: new Date(0),
	permissions: { hasPresence: true, canSend: true, canAdmin: false },
	tracks: {
		audio: track,
		video: track,
		screenAudio: track,
		screenVideo: track,
	},
});

class EmulatedCall {
	private listeners = new Map<string, Set<Listener>>();
	private state = "new";
	private token: string | null = null;
	private roomName = "";
	private me: Person = { userId: "", userName: "", owner: false };
	private others = new Map<string, Person>();
	private watch: ReturnType<typeof setTimeout> | null = null;

	on(event: string, listener: Listener) {
		if (!this.listeners.has(event)) this.listeners.set(event, new Set());
		this.listeners.get(event)?.add(listener);
		return this;
	}

	off(event: string, listener: Listener) {
		this.listeners.get(event)?.delete(listener);
		return this;
	}

	private emit(action: string, payload: Record<string, unknown> = {}) {
		for (const listener of this.listeners.get(action) ?? []) {
			listener({ action, ...payload });
		}
	}

	meetingState() {
		return this.state;
	}

	participants() {
		const local = participant("local", this.me, true);
		return Object.fromEntries([
			["local", local],
			...[...this.others].map(([id, person]) => [
				id,
				participant(id, person, false),
			]),
		]);
	}

	async join({ token }: { url: string; token: string }) {
		this.state = "joining-meeting";
		this.emit("joining-meeting");
		const response = await fetch("/api/dev/daily", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "join", token }),
		});
		if (!response.ok) {
			this.state = "error";
			this.emit("error", { errorMsg: "emulated join refused" });
			throw new Error("emulated join refused");
		}
		const { room, userId } = (await response.json()) as {
			room: string;
			userId: string;
		};
		this.token = token;
		this.roomName = room;
		await this.refresh(userId);
		this.state = "joined-meeting";
		this.emit("joined-meeting", { participants: this.participants() });
		this.poll(userId);
		return this.participants();
	}

	/** The next look a second after the last one ends, so a slow one never overlaps. */
	private poll(userId: string) {
		this.watch = setTimeout(async () => {
			await this.refresh(userId);
			if (this.state === "joined-meeting") this.poll(userId);
		}, 1000);
	}

	/** The room as the emulated Daily sees it: who came, who went, or that it closed. */
	private async refresh(userId: string) {
		const response = await fetch(`/api/dev/daily?room=${this.roomName}`);
		const room = (await response.json()) as { open: boolean; people: Person[] };
		if (!room.open) {
			if (this.state === "joined-meeting") await this.leave();
			return;
		}
		const people = new Map(
			room.people.map((person) => [person.userId, person]),
		);
		this.me = people.get(userId) ?? this.me;
		for (const [id, person] of people) {
			if (id === userId || this.others.has(id)) continue;
			this.others.set(id, person);
			this.emit("participant-joined", {
				participant: participant(id, person, false),
			});
		}
		for (const [id, person] of this.others) {
			if (people.has(id)) continue;
			this.others.delete(id);
			this.emit("participant-left", {
				participant: participant(id, person, false),
			});
		}
	}

	async leave() {
		if (this.watch) clearTimeout(this.watch);
		this.watch = null;
		if (this.token && this.state === "joined-meeting") {
			await fetch("/api/dev/daily", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "leave", token: this.token }),
			});
		}
		this.others.clear();
		this.state = "left-meeting";
		this.emit("left-meeting");
	}

	isDestroyed = () => false;

	// What daily-react's provider and the call page ask of a real call object,
	// answered with nothing to show: no camera, no microphone, no network.
	startCamera = async () => ({});
	setLocalAudio = () => this;
	setLocalVideo = () => this;
	room = async () => ({ name: this.roomName });
	enumerateDevices = async () => ({ devices: [] });
	getInputDevices = async () => ({ camera: {}, mic: {}, speaker: {} });
	setInputDevicesAsync = async () => ({ camera: {}, mic: {}, speaker: {} });
	getNetworkTopology = async () => ({ topology: "none" });
	meetingSessionState = () => ({ data: {}, topology: "none" });
	meetingSessionSummary = () => ({});
	startLocalAudioLevelObserver = async () => undefined;
	startRemoteParticipantsAudioLevelObserver = async () => undefined;
	isLocalAudioLevelObserverRunning = () => false;
	isRemoteParticipantsAudioLevelObserverRunning = () => false;
	setOutputDeviceAsync = async () => ({ speaker: {} });
	subscribeToTracksAutomatically = () => true;
}

export const emulatedCall = () => new EmulatedCall() as unknown as DailyCall;
