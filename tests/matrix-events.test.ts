import {
	ClientEvent,
	EventType,
	HttpApiEvent,
	NotificationCountType,
	RoomEvent,
	SyncState,
} from "matrix-js-sdk";
import { describe, expect, it } from "vitest";
import {
	MatrixEvents,
	PUSH_RULES_EVENT,
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
			accountData: ClientEvent.AccountData,
		});
		expect(PUSH_RULES_EVENT).toBe(EventType.PushRules);
		expect(SyncStates).toEqual({
			prepared: SyncState.Prepared,
			error: SyncState.Error,
		});
		expect(TOTAL_COUNT).toBe(NotificationCountType.Total);
	});
});
