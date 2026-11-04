import { Prisma } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const findUnique = vi.fn();
const checkpointFind = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		certificate: {
			create: (...a: unknown[]) => create(...a),
			findUnique: (...a: unknown[]) => findUnique(...a),
		},
		projectCheckpoint: { findUnique: (...a: unknown[]) => checkpointFind(...a) },
	},
}));

const {
	generateCertificateNumber,
	issueCertificate,
	issueCheckpointCertificate,
} = await import(
	"@/services/certificates"
);
const { getVerifyCertificate } = await import("@/app/api/verify/_helpers");

const conflict = (field: string) =>
	new Prisma.PrismaClientKnownRequestError("unique", {
		code: "P2002",
		clientVersion: "test",
		meta: { target: [field] },
	});

beforeEach(() => vi.clearAllMocks());

describe("issueCertificate", () => {
	it("numbers in Crockford Base32, without ambiguous letters", () => {
		expect(generateCertificateNumber()).toMatch(/^GDH-[0-9A-HJKMNP-TV-Z]{6}$/);
	});

	it("draws another number when one is taken", async () => {
		create
			.mockRejectedValueOnce(conflict("number"))
			.mockResolvedValueOnce({ id: "c1", number: "GDH-AAAAAA", issuedAt: new Date() });
		await issueCertificate({ source: "Course", userId: "u1", courseGroupStudentId: "s1" });
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("refuses a second certificate for the same student instead of retrying", async () => {
		create.mockRejectedValue(conflict("courseGroupStudentId"));
		await expect(
			issueCertificate({ source: "Course", userId: "u1", courseGroupStudentId: "s1" }),
		).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
		expect(create).toHaveBeenCalledTimes(1);
	});
});

const withFounder = (userId: string | null) => ({
	project: { team: { members: userId ? [{ userId }] : [] } },
});

describe("issueCheckpointCertificate", () => {
	it("issues the closed checkpoint's certificate to the project founder", async () => {
		checkpointFind.mockResolvedValue(withFounder("founder1"));
		create.mockResolvedValue({ id: "c1", number: "GDH-AAAAAA", issuedAt: new Date() });

		await issueCheckpointCertificate("cp1");

		expect(create.mock.calls[0][0].data).toMatchObject({
			source: "Checkpoint",
			userId: "founder1",
			checkpointId: "cp1",
		});
	});

	it("issues nothing to a project with no founder", async () => {
		checkpointFind.mockResolvedValue(withFounder(null));

		expect(await issueCheckpointCertificate("cp1")).toBeNull();
		expect(create).not.toHaveBeenCalled();
	});

	it("does not fail a close that issues a second time", async () => {
		checkpointFind.mockResolvedValue(withFounder("founder1"));
		create.mockRejectedValue(conflict("checkpointId"));

		expect(await issueCheckpointCertificate("cp1")).toBeNull();
	});
});

const user = {
	name: "Ann",
	image: null,
	profile: { name: "Ann Lee" },
	specialities: [{ name: "Game designer" }],
};

describe("getVerifyCertificate", () => {
	it("answers nothing for a revoked certificate", async () => {
		findUnique
			.mockResolvedValueOnce({ source: "Course" })
			.mockResolvedValueOnce({ revokedAt: new Date(), source: "Course" });
		expect(await getVerifyCertificate("GDH-AAAAAA")).toBeNull();
	});

	it("shows a course certificate as unsigned, issued by the teacher", async () => {
		findUnique.mockResolvedValueOnce({ source: "Course" }).mockResolvedValueOnce({
			number: "GDH-AAAAAA",
			issuedAt: new Date("2026-10-17T00:00:00Z"),
			source: "Course",
			revokedAt: null,
			user,
			courseGroupStudent: {
				startedAt: new Date("2026-09-01T00:00:00Z"),
				finishedAt: null,
				group: {
					course: {
						name: "Level design",
						slug: "level-design",
						createdByUser: { ...user, profile: { name: "Bo Teacher" } },
					},
				},
			},
			checkpoint: null,
		});
		const data = await getVerifyCertificate("GDH-AAAAAA");
		expect(data).toMatchObject({
			source: "Course",
			signed: false,
			participant: { name: "Ann Lee" },
			subject: {
				title: "Level design",
				href: "/course/level-design",
				issuerName: "Bo Teacher",
			},
		});
	});

	it("shows a checkpoint certificate as the project's, issued by the platform", async () => {
		findUnique.mockResolvedValueOnce({ source: "Checkpoint" }).mockResolvedValueOnce({
			number: "GDH-BBBBBB",
			issuedAt: new Date("2026-11-20T00:00:00Z"),
			source: "Checkpoint",
			revokedAt: null,
			user,
			courseGroupStudent: null,
			checkpoint: {
				stageName: "Prototyping",
				startedAt: new Date("2026-10-20T00:00:00Z"),
				decidedAt: new Date("2026-11-19T00:00:00Z"),
				verdict: "GoalMet",
				goal: "A playable vertical slice",
				curator: { ...user, profile: { name: "Marta Ilves" } },
				project: {
					name: "E2E Test Game",
					slug: "e2e-test-game",
					coverImage: null,
					description: null,
				},
			},
		});
		const data = await getVerifyCertificate("GDH-BBBBBB");
		expect(data).toMatchObject({
			source: "Checkpoint",
			participant: { name: "Ann Lee" },
			project: { name: "E2E Test Game" },
			subject: {
				title: "Prototyping",
				endDate: "2026-11-19T00:00:00.000Z",
				mentorName: "Marta Ilves",
			},
			outcome: { verdict: "GoalMet", goal: "A playable vertical slice" },
		});
		expect(data?.subject.issuerName).toBeTruthy();
	});

	it("answers nothing for a number nobody holds", async () => {
		findUnique.mockResolvedValueOnce(null);
		expect(await getVerifyCertificate("GDH-ZZZZZZ")).toBeNull();
	});
});
