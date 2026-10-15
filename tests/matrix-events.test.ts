import {
	ClientEvent,
	HttpApiEvent,
	NotificationCountType,
	RoomEvent,
	SyncState,
} from "matrix-js-sdk";
import { describe, expect, it } from "vitest";
import {
	MatrixEvents,
	SyncStates,
	TOTAL_COUNT,
} from "@/components/Chat/matrix-events";

describe("matrix event names spelled out for ChatProvider", () => {
	it("match the SDK enums", () => {
		expect(MatrixEvents).toEqual({
			sync: ClientEvent.Sync,
			sessionLoggedOut: HttpApiEvent.SessionLoggedOut,
			receipt: RoomEvent.Receipt,
			timeline: RoomEvent.Timeline,
			myMembership: RoomEvent.MyMembership,
		});
		expect(SyncStates).toEqual({
			prepared: SyncState.Prepared,
			error: SyncState.Error,
		});
		expect(TOTAL_COUNT).toBe(NotificationCountType.Total);
	});
});
