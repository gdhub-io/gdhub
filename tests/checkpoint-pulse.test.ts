import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXTAUTH_SECRET = "test-secret";

const send = vi.fn();
const checkpointFindMany = vi.fn();
const reportFindMany = vi.fn();
const artifactFindMany = vi.fn();
const pulseFindMany = vi.fn();
const pulseCreate = vi.fn();
const pulseFindUnique = vi.fn();
const pulseUpdateMany = vi.fn();
const projectFindUnique = vi.fn();
const auditFindMany = vi.fn();

vi.mock("@/services/checkpoint-notifications", () => ({
	appUrl: () => "https://gdhub.test",
	notify: (...a: unknown[]) => send(...a),
}));
vi.mock("@/repositories/checkpoint-number", () => ({
	checkpointNumber: vi.fn(async () => 2),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findMany: (...a: unknown[]) => checkpointFindMany(...a),
		},
		projectReport: { findMany: (...a: unknown[]) => reportFindMany(...a) },
		projectArtifact: { findMany: (...a: unknown[]) => artifactFindMany(...a) },
		project: { findUnique: (...a: unknown[]) => projectFindUnique(...a) },
		auditLog: { findMany: (...a: unknown[]) => auditFindMany(...a) },
		checkpointPulse: {
			findMany: (...a: unknown[]) => pulseFindMany(...a),
			create: (...a: unknown[]) => pulseCreate(...a),
			findUnique: (...a: unknown[]) => pulseFindUnique(...a),
			updateMany: (...a: unknown[]) => pulseUpdateMany(...a),
		},
	},
}));

const { pulseIdOf, pulseToken } = await import("@/lib/checkpoint-pulse-token");
const { confirmPulse, pulseView, requestPulses } = await import(
	"@/repositories/checkpoint-pulse"
);

// Started Monday 5 Oct: Sunday 11 Oct is day 7, the last of sprint 1;
// call 2 (which opens sprint 2) is on 12 Oct at 14:00.
const startedAt = new Date("2026-10-05T00:00:00Z");
const lastDay = new Date("2026-10-11T01:00:00Z");

beforeEach(() => vi.clearAllMocks());

describe("the pulse token", () => {
	it("names its pulse and refuses anything altered", () => {
		const token = pulseToken("pulse1");
		expect(pulseIdOf(token)).toBe("pulse1");
		expect(pulseIdOf(token.replace("pulse1", "pulse2"))).toBeNull();
		expect(pulseIdOf("pulse1.forged")).toBeNull();
		expect(pulseIdOf("garbage")).toBeNull();
	});
});

describe("requestPulses", () => {
	const member = (id: string) => ({
		id: `m-${id}`,
		user: { id, email: `${id}@x.test` },
	});
	const checkpoint = {
		id: "cp",
		startedAt,
		projectId: "p",
		curatorId: "curator",
		project: {
			name: "Hollow Tide",
			team: {
				members: [
					member("marta"),
					member("oleg"),
					member("ana"),
					member("ivan"),
					member("kira"),
					member("curator"),
				],
			},
		},
	};

	beforeEach(() => {
		checkpointFindMany.mockResolvedValue([checkpoint]);
		reportFindMany.mockResolvedValue([{ authorId: "marta" }]);
		artifactFindMany.mockResolvedValue([{ createdById: "oleg" }]);
		pulseFindMany.mockResolvedValue([{ teamMemberId: "m-ivan" }]);
		projectFindUnique.mockResolvedValue({
			team: {
				id: "team",
				members: [],
				vacancies: [{ id: "vac" }],
				invitations: [],
			},
			workflow: null,
			reports: [],
			artifacts: [],
			checkpoints: [{ id: "cp" }],
		});
		// Kira posted a vacancy this sprint.
		auditFindMany.mockResolvedValue([{ actorUserId: "kira" }]);
		pulseCreate.mockImplementation(async ({ data }) => ({
			id: `pulse-${data.teamMemberId}`,
		}));
	});

	it("counts work already shown, asks the rest once, leaves the curator out", async () => {
		expect(await requestPulses(lastDay)).toEqual({ asked: 1, counted: 3 });

		const created = pulseCreate.mock.calls.map(([args]) => args.data);
		expect(created).toEqual([
			expect.objectContaining({ teamMemberId: "m-marta", week: 1, source: "devlog", confirmedAt: lastDay }),
			expect.objectContaining({ teamMemberId: "m-oleg", week: 1, source: "artifact", confirmedAt: lastDay }),
			{ checkpointId: "cp", teamMemberId: "m-ana", week: 1, requestedAt: lastDay },
			expect.objectContaining({ teamMemberId: "m-kira", week: 1, source: "activity", confirmedAt: lastDay }),
		]);

		expect(send).toHaveBeenCalledTimes(1);
		const [to, transactionId, payload] = send.mock.calls[0];
		expect(to.id).toBe("ana");
		expect(transactionId).toBe("cp-pulse-pulse-m-ana");
		expect(payload.message).toContain("ignore this email");
		expect(pulseIdOf(payload.redirectUrl.split("/pulse/")[1])).toBe("pulse-m-ana");
	});

	it("traces activity to the project through what it touched, in the sprint", async () => {
		await requestPulses(lastDay);
		const { where } = auditFindMany.mock.calls[0][0];
		expect(where.createdAt).toEqual({
			gte: new Date("2026-10-05T00:00:00Z"),
			lt: new Date("2026-10-12T00:00:00Z"),
		});
		expect(where.OR).toEqual([
			{ entity: "Project", entityId: { in: ["p"] } },
			{ entity: "Team", entityId: { in: ["team"] } },
			{ entity: "TeamVacancy", entityId: { in: ["vac"] } },
			{ entity: "ProjectCheckpoint", entityId: { in: ["cp"] } },
		]);
	});

	it("asks nothing on other days of the sprint", async () => {
		expect(await requestPulses(new Date("2026-10-10T01:00:00Z"))).toEqual({
			asked: 0,
			counted: 0,
		});
		expect(pulseCreate).not.toHaveBeenCalled();
	});
});

describe("the pulse page", () => {
	const row = (overrides: { confirmedAt?: Date | null } = {}) => ({
		id: "pulse1",
		week: 1,
		confirmedAt: overrides.confirmedAt ?? null,
		teamMemberId: "m-ana",
		teamMember: {
			startedAt: new Date("2026-09-01T00:00:00Z"),
			finishedAt: null,
			user: { name: "Ana Sousa" },
		},
		checkpoint: {
			id: "cp",
			projectId: "p",
			createdAt: new Date(),
			startedAt,
			project: { name: "Hollow Tide", slug: "hollow-tide" },
			sessions: [{ index: 2, scheduledAt: new Date("2026-10-12T14:00:00Z") }],
			pulses: [
				{
					teamMemberId: "m-ana",
					week: 1,
					confirmedAt: overrides.confirmedAt ?? null,
					source: null,
				},
			],
		},
	});
	const token = pulseToken("pulse1");

	it("stays open until the call that opens the next sprint", async () => {
		pulseFindUnique.mockResolvedValue(row());
		const open = await pulseView(token, new Date("2026-10-12T13:59:00Z"));
		expect(open?.state).toBe("open");
		expect(open?.cells[0]).toEqual({ sprint: 1, state: "waiting" });

		expect((await pulseView(token, new Date("2026-10-12T14:00:00Z")))?.state).toBe(
			"closed",
		);
	});

	it("never writes when the page is opened", async () => {
		pulseFindUnique.mockResolvedValue(row());
		await pulseView(token, lastDay);
		expect(pulseUpdateMany).not.toHaveBeenCalled();
	});

	it("refuses a token it did not sign", async () => {
		expect(await pulseView("pulse1.forged", lastDay)).toBeNull();
		expect(pulseFindUnique).not.toHaveBeenCalled();
	});

	it("confirms once, and only while open", async () => {
		pulseFindUnique.mockResolvedValue(row());
		await confirmPulse(token, lastDay);
		expect(pulseUpdateMany).toHaveBeenCalledWith({
			where: { id: "pulse1", confirmedAt: null },
			data: { confirmedAt: lastDay, source: "email" },
		});

		pulseUpdateMany.mockClear();
		await confirmPulse(token, new Date("2026-10-13T00:00:00Z"));
		expect(pulseUpdateMany).not.toHaveBeenCalled();
	});
});
