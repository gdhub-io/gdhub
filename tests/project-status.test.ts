import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { describe, expect, it } from "vitest";
import {
	resolveDormantTransition,
	statusChangeData,
} from "@/lib/project-status";

const dormantAt = new Date("2026-10-01T04:00:00Z");

describe("resolveDormantTransition", () => {
	it("reactivates when there was activity after going dormant", () => {
		expect(
			resolveDormantTransition({
				dormantAt,
				lastActivityAt: new Date("2026-10-09T12:00:00Z"),
				now: new Date("2026-10-10T04:00:00Z"),
			}),
		).toBe("reactivate");
	});

	it("reactivates rather than archives once the grace period is over", () => {
		expect(
			resolveDormantTransition({
				dormantAt,
				lastActivityAt: new Date("2026-10-02T00:00:00Z"),
				now: new Date("2026-11-01T04:00:00Z"),
			}),
		).toBe("reactivate");
	});

	it("waits while the grace period runs without activity", () => {
		expect(
			resolveDormantTransition({
				dormantAt,
				lastActivityAt: new Date("2026-06-01T00:00:00Z"),
				now: new Date("2026-10-14T04:00:00Z"),
			}),
		).toBeNull();
	});

	it("archives after 14 quiet days", () => {
		expect(
			resolveDormantTransition({
				dormantAt,
				lastActivityAt: dormantAt,
				now: new Date("2026-10-15T04:00:00Z"),
			}),
		).toBe("archive");
	});
});

describe("statusChangeData", () => {
	const now = new Date("2026-10-09T12:00:00Z");

	it("clears every freeze date when a project is approved again", () => {
		expect(statusChangeData(ProjectStatus.Approved, now)).toEqual({
			status: ProjectStatus.Approved,
			statusChangedAt: now,
			updatedAt: now,
			dormantAt: null,
			archivedAt: null,
			killedWithDignityAt: null,
		});
	});

	it("stamps the date that belongs to the new status", () => {
		expect(statusChangeData(ProjectStatus.Dormant, now)).toMatchObject({
			dormantAt: now,
		});
		expect(statusChangeData(ProjectStatus.Archived, now)).toMatchObject({
			archivedAt: now,
		});
		expect(
			statusChangeData(ProjectStatus.KilledWithDignity, now),
		).toMatchObject({ killedWithDignityAt: now });
	});

	it("does not count its own write as activity", () => {
		const data = statusChangeData(ProjectStatus.Dormant, now);

		expect(
			resolveDormantTransition({
				dormantAt: data.dormantAt as Date,
				lastActivityAt: data.updatedAt as Date,
				now: new Date("2026-10-10T04:00:00Z"),
			}),
		).toBeNull();
	});
});
