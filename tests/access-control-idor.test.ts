import {
	CourseStatus,
	InvitationStatus,
	ProjectStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

const db = {
	specialityCreate: vi.fn(),
	specialityUpdateMany: vi.fn(),
	specialityDeleteMany: vi.fn(),
	invitationFindUnique: vi.fn(),
	invitationUpdate: vi.fn(),
	investorFindUnique: vi.fn(),
	investorUpdate: vi.fn(),
	investorDelete: vi.fn(),
	investorCreate: vi.fn(),
	teamFindUnique: vi.fn(),
	projectFindFirst: vi.fn(),
	projectFindUnique: vi.fn(),
	courseFindFirst: vi.fn(),
	courseUpdate: vi.fn(),
	courseDelete: vi.fn(),
	adviceFindFirst: vi.fn(),
};

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		speciality: {
			create: (...a: unknown[]) => db.specialityCreate(...a),
			updateMany: (...a: unknown[]) => db.specialityUpdateMany(...a),
			deleteMany: (...a: unknown[]) => db.specialityDeleteMany(...a),
		},
		teamInvitation: {
			findUnique: (...a: unknown[]) => db.invitationFindUnique(...a),
			update: (...a: unknown[]) => db.invitationUpdate(...a),
		},
		teamInvestor: {
			findUnique: (...a: unknown[]) => db.investorFindUnique(...a),
			update: (...a: unknown[]) => db.investorUpdate(...a),
			delete: (...a: unknown[]) => db.investorDelete(...a),
			create: (...a: unknown[]) => db.investorCreate(...a),
		},
		team: { findUnique: (...a: unknown[]) => db.teamFindUnique(...a) },
		project: {
			findFirst: (...a: unknown[]) => db.projectFindFirst(...a),
			findUnique: (...a: unknown[]) => db.projectFindUnique(...a),
		},
		course: {
			findFirst: (...a: unknown[]) => db.courseFindFirst(...a),
			update: (...a: unknown[]) => db.courseUpdate(...a),
			delete: (...a: unknown[]) => db.courseDelete(...a),
		},
		adviceRequest: {
			findFirst: (...a: unknown[]) => db.adviceFindFirst(...a),
		},
		auditLog: { create: async () => ({ id: "audit-1" }) },
		spaceMember: { findUnique: async () => null },
	},
}));

vi.mock("@/services/cache", () => ({ cacheDelete: async () => undefined }));
vi.mock("@/services/access/membership", () => ({
	deleteSpaceMembership: async () => undefined,
	joinSpace: async () => undefined,
}));

import {
	DELETE as deleteInvestor,
	GET as getInvestor,
	PUT as updateInvestor,
} from "@/app/api/project/team-investor/[id]/route";
import { POST as createInvestor } from "@/app/api/project/team-investor/route";
import { GET as getAdviceRequest } from "@/app/api/user/advice-request/[id]/route";
import { PUT as publishCourse } from "@/app/api/user/course/[id]/publish/route";
import { PUT as unpublishCourse } from "@/app/api/user/course/[id]/unpublish/route";
import { DELETE as deleteCourse } from "@/app/api/user/course/route";
import {
	POST as createSpeciality,
	DELETE as deleteSpeciality,
	PUT as updateSpeciality,
} from "@/app/api/user/speciality/route";
import {
	codeSource,
	setMatrixSource,
} from "@/services/access/matrix-source";

const sessionOf = (id: string, email: string) => ({
	user: { id, email, roles: [UserRole.Member], onboardingDone: true },
});

const OWNER = sessionOf("u-owner", "owner@gdhub.local");
const STRANGER = sessionOf("u-stranger", "stranger@gdhub.local");

const req = (url: string, method: string, body?: unknown) =>
	new NextRequest(`http://localhost${url}`, {
		method,
		...(body === undefined
			? {}
			: {
					body: JSON.stringify(body),
					headers: { "content-type": "application/json" },
				}),
	});

const ctx = (params: Record<string, string> = {}) => ({
	params: Promise.resolve(params),
});

/** Applies the `{ id, userId }` filter the way the database would. */
const ownedRows =
	(rows: { id: string; userId: string }[]) =>
	async ({ where }: { where: { id: string; userId: string } }) => ({
		count: rows.filter((r) => r.id === where.id && r.userId === where.userId)
			.length,
	});

beforeEach(() => {
	setMatrixSource(codeSource);
	for (const fn of Object.values(db)) fn.mockReset();
	authMock.mockReset();

	db.projectFindUnique.mockResolvedValue({ status: ProjectStatus.Approved });
	db.projectFindFirst.mockResolvedValue({
		id: "p1",
		authorId: OWNER.user.id,
		team: { members: [] },
	});
	db.courseFindFirst.mockResolvedValue({
		id: "c1",
		createdById: OWNER.user.id,
		groups: [],
	});
});

describe("speciality: only the owner edits and deletes it", () => {
	const rows = [{ id: "s1", userId: OWNER.user.id }];

	beforeEach(() => {
		db.specialityUpdateMany.mockImplementation(ownedRows(rows));
		db.specialityDeleteMany.mockImplementation(ownedRows(rows));
	});

	it("refuses a stranger's update and delete", async () => {
		authMock.mockResolvedValue(STRANGER);

		const put = await updateSpeciality(
			req("/api/user/speciality", "PUT", { id: "s1", data: { name: "x" } }),
			ctx(),
			{},
		);
		const del = await deleteSpeciality(
			req("/api/user/speciality?id=s1", "DELETE"),
			ctx(),
			{},
		);

		expect(put.status).toBe(404);
		expect(del.status).toBe(404);
	});

	it("lets the owner update and delete", async () => {
		authMock.mockResolvedValue(OWNER);

		const put = await updateSpeciality(
			req("/api/user/speciality", "PUT", { id: "s1", data: { name: "x" } }),
			ctx(),
			{},
		);
		const del = await deleteSpeciality(
			req("/api/user/speciality?id=s1", "DELETE"),
			ctx(),
			{},
		);

		expect(put.status).toBe(200);
		expect(del.status).toBe(200);
	});

	it("drops fields the form does not edit", async () => {
		authMock.mockResolvedValue(OWNER);

		await updateSpeciality(
			req("/api/user/speciality", "PUT", {
				id: "s1",
				data: { name: "x", isFeatured: true, userId: "u-stranger" },
			}),
			ctx(),
			{},
		);

		expect(db.specialityUpdateMany).toHaveBeenCalledWith({
			where: { id: "s1", userId: OWNER.user.id },
			data: { name: "x" },
		});
	});
});

describe("speciality by invitation: only the invitee accepts it", () => {
	const create = (teamInvitationId: string) =>
		createSpeciality(
			req("/api/user/speciality", "POST", {
				data: {
					name: "Artist",
					level: "Expert",
					workDirectionId: "d1",
					specialization: "2D",
					teamInvitationId,
				},
			}),
			ctx(),
			{},
		);

	beforeEach(() => {
		db.invitationFindUnique.mockResolvedValue({
			id: "inv1",
			email: OWNER.user.email,
			userId: null,
			status: InvitationStatus.Pending,
			expiresAt: null,
		});
	});

	it("refuses an invitation addressed to someone else", async () => {
		authMock.mockResolvedValue(STRANGER);

		const response = await create("inv1");

		expect(response.status).toBe(403);
		expect(db.specialityCreate).not.toHaveBeenCalled();
		expect(db.invitationUpdate).not.toHaveBeenCalled();
	});

	it("refuses an expired invitation", async () => {
		authMock.mockResolvedValue(OWNER);
		db.invitationFindUnique.mockResolvedValue({
			id: "inv1",
			email: OWNER.user.email,
			userId: null,
			status: InvitationStatus.Pending,
			expiresAt: new Date(Date.now() - 1000),
		});

		const response = await create("inv1");

		expect(response.status).toBe(400);
		expect(db.invitationUpdate).not.toHaveBeenCalled();
	});

	it("accepts the invitee's own invitation", async () => {
		authMock.mockResolvedValue(OWNER);

		const response = await create("inv1");

		expect(response.status).toBe(200);
		expect(db.specialityCreate).toHaveBeenCalledOnce();
		expect(db.invitationUpdate).toHaveBeenCalledWith({
			where: { id: "inv1" },
			data: { status: InvitationStatus.Accepted },
		});
	});
});

describe("team investors: only those who manage the project's equity", () => {
	beforeEach(() => {
		db.investorFindUnique.mockImplementation(
			async ({ select }: { select?: unknown }) =>
				select ? { team: { projectId: "p1" } } : { id: "i1", name: "A" },
		);
		db.teamFindUnique.mockResolvedValue({ projectId: "p1" });
		db.investorUpdate.mockResolvedValue({ id: "i1" });
		db.investorDelete.mockResolvedValue({ id: "i1" });
		db.investorCreate.mockResolvedValue({ id: "i2" });
	});

	const body = { name: "A", teamId: "t1", share: 1, value: 10 };

	it("refuses a stranger to create, read, edit or delete", async () => {
		authMock.mockResolvedValue(STRANGER);

		const responses = [
			await createInvestor(
				req("/api/project/team-investor", "POST", body),
				ctx(),
				{},
			),
			await getInvestor(
				req("/api/project/team-investor/i1", "GET"),
				ctx({ id: "i1" }),
				{},
			),
			await updateInvestor(
				req("/api/project/team-investor/i1", "PUT", { share: 50 }),
				ctx({ id: "i1" }),
				{},
			),
			await deleteInvestor(
				req("/api/project/team-investor/i1", "DELETE"),
				ctx({ id: "i1" }),
				{},
			),
		];

		expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404]);
		expect(db.investorCreate).not.toHaveBeenCalled();
		expect(db.investorUpdate).not.toHaveBeenCalled();
		expect(db.investorDelete).not.toHaveBeenCalled();
	});

	it("lets the project owner manage them", async () => {
		authMock.mockResolvedValue(OWNER);

		const created = await createInvestor(
			req("/api/project/team-investor", "POST", body),
			ctx(),
			{},
		);
		const updated = await updateInvestor(
			req("/api/project/team-investor/i1", "PUT", { share: 5, teamId: "t9" }),
			ctx({ id: "i1" }),
			{},
		);
		const deleted = await deleteInvestor(
			req("/api/project/team-investor/i1", "DELETE"),
			ctx({ id: "i1" }),
			{},
		);

		expect([created.status, updated.status, deleted.status]).toEqual([
			200, 200, 200,
		]);
		// An investor row cannot be moved onto another team.
		expect(db.investorUpdate.mock.calls[0][0].data).not.toHaveProperty(
			"teamId",
		);
	});

	it("never exposes the investor's email", async () => {
		authMock.mockResolvedValue(OWNER);

		await getInvestor(
			req("/api/project/team-investor/i1", "GET"),
			ctx({ id: "i1" }),
			{},
		);

		const query = db.investorFindUnique.mock.calls.find(
			([args]) => !args.select,
		)?.[0];
		expect(query.include.user).toEqual({
			select: { id: true, name: true, image: true },
		});
	});
});

describe("courses: only the author publishes, unpublishes or deletes", () => {
	it("refuses a stranger", async () => {
		authMock.mockResolvedValue(STRANGER);

		const responses = [
			await publishCourse(
				req("/api/user/course/c1/publish", "PUT"),
				ctx({ id: "c1" }),
				{},
			),
			await unpublishCourse(
				req("/api/user/course/c1/unpublish", "PUT"),
				ctx({ id: "c1" }),
				{},
			),
			await deleteCourse(req("/api/user/course?id=c1", "DELETE"), ctx(), {}),
		];

		expect(responses.map((r) => r.status)).toEqual([404, 404, 404]);
		expect(db.courseUpdate).not.toHaveBeenCalled();
		expect(db.courseDelete).not.toHaveBeenCalled();
	});

	it("lets the author", async () => {
		authMock.mockResolvedValue(OWNER);

		const published = await publishCourse(
			req("/api/user/course/c1/publish", "PUT"),
			ctx({ id: "c1" }),
			{},
		);
		const deleted = await deleteCourse(
			req("/api/user/course?id=c1", "DELETE"),
			ctx(),
			{},
		);

		expect(published.status).toBe(200);
		expect(db.courseUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "c1" },
				data: expect.objectContaining({ status: CourseStatus.Published }),
			}),
		);
		expect(deleted.status).toBe(200);
		expect(db.courseDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
	});
});

describe("advice request: only its two parties read it", () => {
	const row = {
		id: "a1",
		fromUserId: OWNER.user.id,
		toUserId: "u-expert",
	};

	beforeEach(() => {
		db.adviceFindFirst.mockImplementation(
			async ({
				where,
			}: {
				where: { id: string; OR: Record<string, string>[] };
			}) =>
				where.id === row.id &&
				where.OR.some((clause) =>
					Object.entries(clause).every(
						([key, value]) => row[key as keyof typeof row] === value,
					),
				)
					? row
					: null,
		);
	});

	it("answers 404 to a third user", async () => {
		authMock.mockResolvedValue(STRANGER);

		const response = await getAdviceRequest(
			req("/api/user/advice-request/a1", "GET"),
			ctx({ id: "a1" }),
			{},
		);

		expect(response.status).toBe(404);
	});

	it("serves the sender and the expert, without contact details", async () => {
		for (const session of [OWNER, sessionOf("u-expert", "e@gdhub.local")]) {
			authMock.mockResolvedValue(session);

			const response = await getAdviceRequest(
				req("/api/user/advice-request/a1", "GET"),
				ctx({ id: "a1" }),
				{},
			);

			expect(response.status).toBe(200);
		}

		const { select } = db.adviceFindFirst.mock.calls[0][0];
		expect(select.fromUser).toEqual({
			select: { id: true, name: true, image: true },
		});
		expect(select.toUser).toEqual({
			select: { id: true, name: true, image: true },
		});
		expect(select).not.toHaveProperty("fromTelegramUser");
	});
});
