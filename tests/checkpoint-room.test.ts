import { describe, expect, it } from "vitest";
import {
	CheckpointCuratorKind,
	CheckpointStatus,
} from "@/config/prisma-enums";
import { opensRoom } from "@/lib/checkpoint-room";

describe("opensRoom", () => {
	it("opens for a running checkpoint curated by a person", () => {
		expect(
			opensRoom({
				status: CheckpointStatus.Active,
				curatorKind: CheckpointCuratorKind.Human,
			}),
		).toBe(true);
	});

	it("stays shut for an AI curator", () => {
		expect(
			opensRoom({
				status: CheckpointStatus.Active,
				curatorKind: CheckpointCuratorKind.AI,
			}),
		).toBe(false);
	});

	it("stays shut outside the 28 days, and with no checkpoint at all", () => {
		for (const status of Object.values(CheckpointStatus)) {
			if (status === CheckpointStatus.Active) continue;
			expect(
				opensRoom({ status, curatorKind: CheckpointCuratorKind.Human }),
			).toBe(false);
		}
		expect(opensRoom(null)).toBe(false);
	});
});
