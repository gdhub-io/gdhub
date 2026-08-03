import { describe, expect, it } from "vitest";
import { SpaceRole } from "@/config/permissions/roles";
import {
	type Candidate,
	HUB_ROLE,
	mergeMemberships,
} from "@/services/access/backfill";

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
	type: "project",
	spaceId: "p1",
	userId: "u1",
	role: SpaceRole.Member,
	source: "test",
	...overrides,
});

describe("mergeMemberships", () => {
	it("keeps one row per space and user", () => {
		const merged = mergeMemberships([
			candidate(),
			candidate({ source: "other" }),
		]);

		expect(merged).toHaveLength(1);
		expect(merged[0]?.sources).toEqual(["test", "other"]);
	});

	it("keeps the strongest role — the author is also a Founder", () => {
		const merged = mergeMemberships([
			candidate({ role: SpaceRole.Owner, source: "project.authorId" }),
			candidate({ role: SpaceRole.Member, source: "teamMember.Hired" }),
		]);

		expect(merged[0]?.role).toBe(SpaceRole.Owner);
	});

	it("does not depend on the order the tables were read in", () => {
		const first = mergeMemberships([
			candidate({ role: SpaceRole.Member, source: "teamMember.Hired" }),
			candidate({ role: SpaceRole.Owner, source: "project.authorId" }),
		]);
		const second = mergeMemberships([
			candidate({ role: SpaceRole.Owner, source: "project.authorId" }),
			candidate({ role: SpaceRole.Member, source: "teamMember.Hired" }),
		]);

		expect(first[0]?.role).toBe(second[0]?.role);
	});

	it("keeps spaces and users apart", () => {
		const merged = mergeMemberships([
			candidate(),
			candidate({ spaceId: "p2" }),
			candidate({ userId: "u2" }),
			candidate({ type: "event", spaceId: "e1" }),
		]);

		expect(merged).toHaveLength(4);
	});

	it("promotes a hub member to staff", () => {
		const merged = mergeMemberships([
			candidate({
				type: "hub",
				spaceId: "default",
				role: SpaceRole.Member,
				source: "user.onboardingDone",
			}),
			candidate({
				type: "hub",
				spaceId: "default",
				role: SpaceRole.Admin,
				source: "user.roles=Admin",
			}),
		]);

		expect(merged[0]?.role).toBe(SpaceRole.Admin);
	});
});

describe("hub role", () => {
	it("follows onboarding", () => {
		expect(HUB_ROLE(true)).toBe(SpaceRole.Member);
		expect(HUB_ROLE(false)).toBe(SpaceRole.Guest);
	});
});
