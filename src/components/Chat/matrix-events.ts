import type {
	ClientEvent,
	HttpApiEvent,
	NotificationCountType,
	RoomEvent,
	SyncState,
} from "matrix-js-sdk";

/**
 * The SDK enum values ChatProvider needs, spelled out: it is mounted on every
 * page of the app, and importing the enums would put the whole SDK into that
 * bundle. `tests/matrix-events.test.ts` keeps them equal to the SDK's own.
 */
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
