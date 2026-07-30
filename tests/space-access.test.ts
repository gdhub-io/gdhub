import { TeamMemberStatus, UserRole } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindFirst = vi.fn();
const eventFindUnique = vi.fn();
const courseFindFirst = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: { findFirst: (...args: unknown[]) => projectFindFirst(...args) },
		event: { findUnique: (...args: unknown[]) => eventFindUnique(...args) },
		course: { findFirst: (...args: unknown[]) => courseFindFirst(...args) },
	},
}));

import { resolveSpaceAccess } from "@/helpers/space-access";

const admin = { id: "u-admin", roles: [UserRole.Admin] };
const member = { id: "u-member", roles: [UserRole.Member] };

beforeEach(() => {
	projectFindFirst.mockReset();
	eventFindUnique.mockReset();
	courseFindFirst.mockReset();
});

describe("resolveSpaceAccess — admin / dev", () => {
	it("admin space: Admin role → admin; non-admin → none; no user → none", async () => {
		expect(await resolveSpaceAccess("admin", null, admin)).toBe("admin");
		expect(await resolveSpaceAccess("admin", null, member)).toBe("none");
		expect(await resolveSpaceAccess("admin", null, null)).toBe("none");
	});

	it("dev space: allowed outside production (NODE_ENV=test)", async () => {
		expect(await resolveSpaceAccess("dev", null, member)).toBe("admin");
	});
});

describe("resolveSpaceAccess — project", () => {
	it("author → owner", async () => {
		projectFindFirst.mockResolvedValue({
			authorId: member.id,
			team: { members: [] },
		});
		expect(await resolveSpaceAccess("project", "slug", member)).toBe("owner");
	});

	it("Founder team membership → owner", async () => {
		projectFindFirst.mockResolvedValue({
			authorId: "someone-else",
			team: { members: [{ status: TeamMemberStatus.Founder }] },
		});
		expect(await resolveSpaceAccess("project", "slug", member)).toBe("owner");
	});

	it("non-Founder team membership → member", async () => {
		projectFindFirst.mockResolvedValue({
			authorId: "someone-else",
			team: { members: [{ status: TeamMemberStatus.Hired }] },
		});
		expect(await resolveSpaceAccess("project", "slug", member)).toBe("member");
	});

	it("not author and no membership → none", async () => {
		projectFindFirst.mockResolvedValue({
			authorId: "someone-else",
			team: { members: [] },
		});
		expect(await resolveSpaceAccess("project", "slug", member)).toBe("none");
	});

	it("project not found → none", async () => {
		projectFindFirst.mockResolvedValue(null);
		expect(await resolveSpaceAccess("project", "slug", member)).toBe("none");
	});

	it("missing id → none, no query", async () => {
		expect(await resolveSpaceAccess("project", null, member)).toBe("none");
		expect(projectFindFirst).not.toHaveBeenCalled();
	});
});

describe("resolveSpaceAccess — event", () => {
	it("creator → owner", async () => {
		eventFindUnique.mockResolvedValue({ createdById: member.id });
		expect(await resolveSpaceAccess("event", "e1", member)).toBe("owner");
	});

	it("platform Admin (not creator) → admin", async () => {
		eventFindUnique.mockResolvedValue({ createdById: "someone-else" });
		expect(await resolveSpaceAccess("event", "e1", admin)).toBe("admin");
	});

	it("non-creator, non-admin → none", async () => {
		eventFindUnique.mockResolvedValue({ createdById: "someone-else" });
		expect(await resolveSpaceAccess("event", "e1", member)).toBe("none");
	});

	it("event not found → none (even for admin)", async () => {
		eventFindUnique.mockResolvedValue(null);
		expect(await resolveSpaceAccess("event", "e1", admin)).toBe("none");
	});
});

describe("resolveSpaceAccess — course", () => {
	it("creator → owner", async () => {
		courseFindFirst.mockResolvedValue({ createdById: member.id, groups: [] });
		expect(await resolveSpaceAccess("course", "c1", member)).toBe("owner");
	});

	it("enrolled student → member", async () => {
		courseFindFirst.mockResolvedValue({
			createdById: "someone-else",
			groups: [{ students: [{ userId: member.id }] }],
		});
		expect(await resolveSpaceAccess("course", "c1", member)).toBe("member");
	});

	it("not creator and not enrolled → none", async () => {
		courseFindFirst.mockResolvedValue({
			createdById: "someone-else",
			groups: [{ students: [] }],
		});
		expect(await resolveSpaceAccess("course", "c1", member)).toBe("none");
	});

	it("course not found → none", async () => {
		courseFindFirst.mockResolvedValue(null);
		expect(await resolveSpaceAccess("course", "c1", member)).toBe("none");
	});

	it("missing id → none, no query", async () => {
		expect(await resolveSpaceAccess("course", null, member)).toBe("none");
		expect(courseFindFirst).not.toHaveBeenCalled();
	});
});
