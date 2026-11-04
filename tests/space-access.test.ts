import {
	CourseStudentStatus,
	EventMemberStatus,
	ProjectStatus,
	TeamMemberStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindFirst = vi.fn();
const spaceMemberFindUnique = vi.fn();
const projectFindUnique = vi.fn();
const eventFindUnique = vi.fn();
const courseFindFirst = vi.fn();
const specialityCount = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: {
			findFirst: (...args: unknown[]) => projectFindFirst(...args),
			findUnique: (...args: unknown[]) => projectFindUnique(...args),
		},
		event: { findUnique: (...args: unknown[]) => eventFindUnique(...args) },
		course: { findFirst: (...args: unknown[]) => courseFindFirst(...args) },
		spaceMember: {
			findUnique: (...args: unknown[]) => spaceMemberFindUnique(...args),
		},
		speciality: { count: (...args: unknown[]) => specialityCount(...args) },
	},
}));

import { SpaceRole } from "@/config/permissions/roles";
import { can, canEnter, getSpaceAccess, scopeOf } from "@/services/access";
import {
	codeSource,
	setMatrixSource,
} from "@/services/access/matrix-source";

const guest = { id: "u-guest", roles: [UserRole.Guest], onboardingDone: false };
const member = { id: "u-member", roles: [UserRole.Member], onboardingDone: true };
const staff = { id: "u-staff", roles: [UserRole.Admin], onboardingDone: true };
const superAdmin = { ...member, id: "u-super", isSuperAdmin: true };

/** A project where `member` holds the given team status. */
const projectWith = (
	overrides: {
		authorId?: string;
		status?: TeamMemberStatus;
		projectStatus?: ProjectStatus;
	} = {},
) => {
	projectFindFirst.mockResolvedValue({
		id: "p1",
		authorId: overrides.authorId ?? "someone-else",
		team: {
			members: overrides.status ? [{ status: overrides.status }] : [],
		},
	});
	projectFindUnique.mockResolvedValue({
		status: overrides.projectStatus ?? ProjectStatus.Approved,
	});
};

beforeEach(() => {
	// These tests are about roles and permissions, not about where the matrix is
	// stored: take it from the registry instead of the (mocked away) database.
	setMatrixSource(codeSource);
	spaceMemberFindUnique.mockReset();
	// No membership rows yet: the roles below still come from the domain tables
	// through the adapters. The backfill is what fills this in.
	spaceMemberFindUnique.mockResolvedValue(null);
	projectFindFirst.mockReset();
	projectFindUnique.mockReset();
	eventFindUnique.mockReset();
	courseFindFirst.mockReset();
	projectFindUnique.mockResolvedValue({ status: ProjectStatus.Approved });
	// The hub adapter revokes event creation from a member with no expert-level
	// speciality. That rule has its own tests; here the user always qualifies, so
	// these assertions stay about roles.
	specialityCount.mockReset();
	specialityCount.mockResolvedValue(1);
});

describe("hub — the role that doubles as the platform role", () => {
	it("gives a member to a user who finished onboarding", async () => {
		const access = await getSpaceAccess("hub", null, member);

		expect(access.role).toBe(SpaceRole.Member);
		expect(can(access, "hub.talent_pool.view")).toBe(true);
		expect(can(access, "hub.projects.create")).toBe(true);
	});

	it("gives a guest to a user who has not", async () => {
		const access = await getSpaceAccess("hub", null, guest);

		expect(access.role).toBe(SpaceRole.Guest);
		// Showcases are open…
		expect(can(access, "hub.projects.view")).toBe(true);
		// …the talent pool and any participation are not.
		expect(can(access, "hub.talent_pool.view")).toBe(false);
		expect(can(access, "hub.projects.create")).toBe(false);
		expect(can(access, "hub.jobs.apply")).toBe(false);
	});

	it("gives an admin to platform staff", async () => {
		const access = await getSpaceAccess("hub", null, staff);

		expect(access.role).toBe(SpaceRole.Admin);
	});

	// Running an event is a craft judgement rather than a platform privilege: the
	// role hands out `hub.events.create`, the profile decides whether it is kept.
	it("only lets a member create events once a speciality is expert enough", async () => {
		specialityCount.mockResolvedValue(0);
		const unqualified = await getSpaceAccess("hub", null, member);

		expect(unqualified.role).toBe(SpaceRole.Member);
		expect(can(unqualified, "hub.events.create")).toBe(false);
		// Revoking is one right, not a blanket: everything else survives.
		expect(can(unqualified, "hub.events.view")).toBe(true);
		expect(can(unqualified, "hub.projects.create")).toBe(true);

		specialityCount.mockResolvedValue(1);
		const qualified = await getSpaceAccess("hub", null, member);

		expect(can(qualified, "hub.events.create")).toBe(true);
	});

	it("does not hold staff to the speciality requirement", async () => {
		specialityCount.mockResolvedValue(0);
		const access = await getSpaceAccess("hub", null, staff);

		expect(can(access, "hub.events.create")).toBe(true);
	});

	it("keeps the preview live room away from members", async () => {
		const asMember = await getSpaceAccess("hub", null, member);
		const asStaff = await getSpaceAccess("hub", null, staff);

		expect(can(asMember, "hub.live_room.use")).toBe(false);
		expect(can(asStaff, "hub.live_room.use")).toBe(true);
		expect(can(asStaff, "hub.live_room.manage")).toBe(true);
	});

	it("refuses an anonymous caller", async () => {
		const access = await getSpaceAccess("hub", null, null);

		expect(access.role).toBe("none");
		expect(canEnter(access)).toBe(false);
	});
});

describe("project", () => {
	it("author → owner", async () => {
		projectWith({ authorId: member.id });
		const access = await getSpaceAccess("project", "slug", member);

		expect(access.role).toBe(SpaceRole.Owner);
		expect(access.id).toBe("p1");
		expect(can(access, "project.lifecycle.delete")).toBe(true);
	});

	it("Founder → owner", async () => {
		projectWith({ status: TeamMemberStatus.Founder });

		expect((await getSpaceAccess("project", "slug", member)).role).toBe(SpaceRole.Owner);
	});

	it("hired team member → member", async () => {
		projectWith({ status: TeamMemberStatus.Hired });
		const access = await getSpaceAccess("project", "slug", member);

		expect(access.role).toBe(SpaceRole.Member);
		expect(can(access, "project.workflow.view")).toBe(true);
		expect(can(access, "project.members.view")).toBe(true);
		// Managing stays with the admin, destroying with the owner.
		expect(can(access, "project.members.invite")).toBe(false);
		expect(can(access, "project.lifecycle.archive")).toBe(false);
	});

	it("fired member loses access", async () => {
		projectWith({ status: TeamMemberStatus.Fired });

		expect((await getSpaceAccess("project", "slug", member)).role).toBe("none");
	});

	it("stranger → none", async () => {
		projectWith();

		expect((await getSpaceAccess("project", "slug", member)).role).toBe("none");
	});

	it("missing project → none", async () => {
		projectFindFirst.mockResolvedValue(null);

		expect((await getSpaceAccess("project", "slug", member)).role).toBe("none");
	});

	it("limits a member's view of the cap table to their own shares", async () => {
		projectWith({ status: TeamMemberStatus.Hired });
		const access = await getSpaceAccess("project", "slug", member);

		expect(can(access, "project.equity.view")).toBe(true);
		expect(scopeOf(access, "project.equity.view")).toBe("own");
		expect(can(access, "project.equity.manage")).toBe(false);
	});

	it("an archived project freezes: readable, not writable", async () => {
		projectWith({
			authorId: member.id,
			projectStatus: ProjectStatus.Archived,
		});
		const access = await getSpaceAccess("project", "slug", member);

		expect(access.role).toBe(SpaceRole.Owner);
		expect(can(access, "project.workflow.view")).toBe(true);
		expect(can(access, "project.workflow.edit")).toBe(false);
		expect(can(access, "project.info.edit")).toBe(false);
		expect(can(access, "project.members.invite")).toBe(false);
		expect(can(access, "project.devlog.create")).toBe(false);
	});
});

describe("event", () => {
	it("creator → owner", async () => {
		eventFindUnique.mockResolvedValue({
			id: "e1",
			createdById: member.id,
			members: [],
		});

		expect((await getSpaceAccess("event", "e1", member)).role).toBe(SpaceRole.Owner);
	});

	it("approved participant → member", async () => {
		eventFindUnique.mockResolvedValue({
			id: "e1",
			createdById: "someone-else",
			members: [{ id: "em1" }],
		});
		const access = await getSpaceAccess("event", "e1", member);

		expect(access.role).toBe(SpaceRole.Member);
		expect(can(access, "event.schedule.view")).toBe(true);
		expect(can(access, "event.schedule.edit")).toBe(false);
	});

	it("a pending application does not open the space", async () => {
		// The adapter only counts Approved members, so a pending one looks empty.
		eventFindUnique.mockResolvedValue({
			id: "e1",
			createdById: "someone-else",
			members: [],
		});

		expect((await getSpaceAccess("event", "e1", member)).role).toBe("none");
	});

	it("missing event → none", async () => {
		eventFindUnique.mockResolvedValue(null);

		expect((await getSpaceAccess("event", "e1", member)).role).toBe("none");
	});
});

describe("course", () => {
	it("author → owner", async () => {
		courseFindFirst.mockResolvedValue({
			id: "c1",
			createdById: member.id,
			groups: [],
		});

		expect((await getSpaceAccess("course", "c1", member)).role).toBe(SpaceRole.Owner);
	});

	it("enrolled student → member", async () => {
		courseFindFirst.mockResolvedValue({
			id: "c1",
			createdById: "someone-else",
			groups: [{ students: [{ userId: member.id }] }],
		});
		const access = await getSpaceAccess("course", "c1", member);

		expect(access.role).toBe(SpaceRole.Member);
		expect(can(access, "course.classroom.access")).toBe(true);
		expect(can(access, "course.classroom.teach")).toBe(false);
	});

	it("not enrolled → none", async () => {
		courseFindFirst.mockResolvedValue({
			id: "c1",
			createdById: "someone-else",
			groups: [{ students: [] }],
		});

		expect((await getSpaceAccess("course", "c1", member)).role).toBe("none");
	});
});

describe("platform staff", () => {
	it("gets no role in somebody else's project", async () => {
		projectWith();
		const access = await getSpaceAccess("project", "slug", staff);

		// Administering the platform is not the same as taking part in a project.
		// Crossing that line is the super-admin's job, and it is audited.
		expect(access.role).toBe("none");
		expect(canEnter(access)).toBe(false);
	});

	it("gets no role in somebody else's event or course either", async () => {
		eventFindUnique.mockResolvedValue({
			id: "e1",
			createdById: "someone-else",
			members: [],
		});
		courseFindFirst.mockResolvedValue({
			id: "c1",
			createdById: "someone-else",
			groups: [{ students: [] }],
		});

		expect((await getSpaceAccess("event", "e1", staff)).role).toBe("none");
		expect((await getSpaceAccess("course", "c1", staff)).role).toBe("none");
	});

	it("keeps a role it earned the normal way", async () => {
		projectWith({ authorId: staff.id });

		expect((await getSpaceAccess("project", "slug", staff)).role).toBe(
			SpaceRole.Owner,
		);
	});

	it("enters the admin space, an ordinary member does not", async () => {
		expect((await getSpaceAccess("admin", null, staff)).role).toBe(SpaceRole.Admin);
		expect((await getSpaceAccess("admin", null, member)).role).toBe("none");
	});

	it("enters the dev space outside production", async () => {
		expect((await getSpaceAccess("dev", null, staff)).role).toBe(SpaceRole.Admin);
		expect((await getSpaceAccess("dev", null, member)).role).toBe("none");
	});

	it("finds no dev space in production", async () => {
		vi.stubEnv("NODE_ENV", "production");

		expect((await getSpaceAccess("dev", null, staff)).role).toBe("none");

		vi.unstubAllEnvs();
	});
});

describe("super-admin", () => {
	it("bypasses the matrix in every space", async () => {
		projectWith();
		const access = await getSpaceAccess("project", "slug", superAdmin);

		expect(access.role).toBe(SpaceRole.Owner);
		expect(access.viaSuperAdmin).toBe(true);
		expect(can(access, "project.lifecycle.delete")).toBe(true);
		expect(can(access, "project.equity.manage")).toBe(true);
	});

	it("is not stopped by an archived project", async () => {
		projectWith({ projectStatus: ProjectStatus.Archived });
		const access = await getSpaceAccess("project", "slug", superAdmin);

		expect(can(access, "project.info.edit")).toBe(true);
	});
});

describe("shadow mode", () => {
	it("lets a denial through and logs it when RBAC_ENFORCE=false", async () => {
		projectWith({ status: TeamMemberStatus.Hired });
		const access = await getSpaceAccess("project", "slug", member);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		vi.stubEnv("RBAC_ENFORCE", "false");

		expect(can(access, "project.members.invite")).toBe(true);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("would deny project.members.invite"),
		);

		vi.unstubAllEnvs();
		warn.mockRestore();
	});

	it("enforces by default", async () => {
		projectWith({ status: TeamMemberStatus.Hired });
		const access = await getSpaceAccess("project", "slug", member);

		expect(can(access, "project.members.invite")).toBe(false);
	});
});

describe("statuses that must never open a space", () => {
	it.each([TeamMemberStatus.Fired])("project: %s", async (status) => {
		projectWith({ status });

		expect((await getSpaceAccess("project", "slug", member)).role).toBe("none");
	});

	it.each([
		CourseStudentStatus.Blocked,
		CourseStudentStatus.Expelled,
	])("course: %s", async (status) => {
		// The adapter filters by status, so a blocked student comes back empty.
		expect(status).toBeDefined();
		courseFindFirst.mockResolvedValue({
			id: "c1",
			createdById: "someone-else",
			groups: [{ students: [] }],
		});

		expect((await getSpaceAccess("course", "c1", member)).role).toBe("none");
	});

	it.each([EventMemberStatus.Pending, EventMemberStatus.Rejected])(
		"event: %s",
		async (status) => {
			expect(status).toBeDefined();
			eventFindUnique.mockResolvedValue({
				id: "e1",
				createdById: "someone-else",
				members: [],
			});

			expect((await getSpaceAccess("event", "e1", member)).role).toBe("none");
		},
	);
});

describe("membership takes precedence over the domain tables", () => {
	it("grants the stored role even when the domain says nothing", async () => {
		projectWith();
		spaceMemberFindUnique.mockImplementation(
			async ({ where }: { where: { spaceType_spaceId_userId: { spaceType: string } } }) =>
				where.spaceType_spaceId_userId.spaceType === "project"
					? { role: SpaceRole.Admin, revokedAt: null }
					: null,
		);

		const access = await getSpaceAccess("project", "slug", member);

		// This is how an invited manager gets in: no team row, just membership.
		expect(access.role).toBe(SpaceRole.Admin);
		expect(can(access, "project.members.invite")).toBe(true);
	});

	it("keeps the stronger of the two", async () => {
		projectWith({ authorId: member.id });
		spaceMemberFindUnique.mockResolvedValue({
			role: SpaceRole.Member,
			revokedAt: null,
		});

		// The author owns the project; a weaker membership row must not demote them.
		expect((await getSpaceAccess("project", "slug", member)).role).toBe(
			SpaceRole.Owner,
		);
	});

	it("ignores a revoked membership", async () => {
		projectWith();
		spaceMemberFindUnique.mockResolvedValue({
			role: SpaceRole.Admin,
			revokedAt: new Date(),
		});

		expect((await getSpaceAccess("project", "slug", member)).role).toBe("none");
	});
});
