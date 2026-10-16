import type {
	ClientEvent,
	HttpApiEvent,
	NotificationCountType,
	RoomEvent,
	SyncState,
} from "matrix-js-sdk";

// SDK enum values spelled out so the always-mounted ChatProvider does not
// bundle the SDK; tests/matrix-events.test.ts keeps them in sync.
export const MatrixEvents = {
	sync: "sync" as ClientEvent.Sync,
	sessionLoggedOut: "Session.logged_out" as HttpApiEvent.SessionLoggedOut,
	receipt: "Room.receipt" as RoomEvent.Receipt,
	timeline: "Room.timeline" as RoomEvent.Timeline,
	myMembership: "Room.myMembership" as RoomEvent.MyMembership,
};

export const SyncStates = {
	prepared: "PREPARED" as SyncState.Prepared,
	error: "ERROR" as SyncState.Error,
};

export const TOTAL_COUNT = "total" as NotificationCountType.Total;
