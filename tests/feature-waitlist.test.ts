import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistFeature } from "@/config/prisma-enums";
import {
	isOnWaitlist,
	joinWaitlist,
	listWaitlist,
	writeToWaitlist,
} from "@/repositories/user/feature-waitlist";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		featureWaitlist: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
		},
		user: { findMany: vi.fn() },
		auditLog: { create: vi.fn() },
	},
}));

const EXPERT = WaitlistFeature.ExpertCheckpoint;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.featureWaitlist.findMany).mockResolvedValue([] as never);
	vi.mocked(prisma.featureWaitlist.count).mockResolvedValue(0);
});

describe("a feature waitlist", () => {
	it("keeps one row per email and feature, whatever the case of the email", async () => {
		await joinWaitlist(EXPERT, "Marta@Example.com");

		expect(prisma.featureWaitlist.upsert).toHaveBeenCalledWith({
			where: { feature_email: { feature: EXPERT, email: "marta@example.com" } },
			create: { feature: EXPERT, email: "marta@example.com" },
			// A second join keeps the first date.
			update: {},
			select: { id: true },
		});
	});

	it("finds a person by the same lower-cased email", async () => {
		vi.mocked(prisma.featureWaitlist.findUnique).mockResolvedValue({
			id: "w1",
		} as never);

		await expect(isOnWaitlist(EXPERT, "MARTA@example.com")).resolves.toBe(true);
		expect(prisma.featureWaitlist.findUnique).toHaveBeenCalledWith({
			where: { feature_email: { feature: EXPERT, email: "marta@example.com" } },
			select: { id: true },
		});
	});

	it("lists one feature only, and counts it whatever the search", async () => {
		await listWaitlist(EXPERT, "studio");

		expect(prisma.featureWaitlist.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					feature: EXPERT,
					email: { contains: "studio", mode: "insensitive" },
				},
				orderBy: { createdAt: "desc" },
			}),
		);
		expect(prisma.featureWaitlist.count).toHaveBeenCalledWith({
			where: { feature: EXPERT },
		});
	});
});

describe("writing to a waitlist", () => {
	const letter = {
		title: "Running with an expert is open",
		message: "Pick yours.",
		redirectUrl: "https://gdhub.io/checkpoint/new",
	};

	beforeEach(() => {
		vi.mocked(prisma.featureWaitlist.findMany).mockResolvedValue([
			{ id: "w1", email: "anna@x.io" },
			{ id: "w2", email: "gone@x.io" },
		] as never);
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{ id: "u1", email: "Anna@x.io" },
		] as never);
		vi.mocked(NovuService.send).mockResolvedValue(undefined);
	});

	it("writes to the chosen rows of one feature only", async () => {
		await writeToWaitlist("admin", EXPERT, { ...letter, ids: ["w1", "w2"] });

		expect(prisma.featureWaitlist.findMany).toHaveBeenCalledWith({
			where: { feature: EXPERT, id: { in: ["w1", "w2"] } },
			select: { id: true, email: true },
		});
	});

	it("sends to the account behind each email, and the email when it is gone", async () => {
		await writeToWaitlist("admin", EXPERT, letter);

		const to = vi.mocked(NovuService.send).mock.calls.map(([args]) => args.to);
		expect(to).toEqual([
			{ subscriberId: "u1", email: "anna@x.io" },
			{ subscriberId: "waitlist-gone@x.io", email: "gone@x.io" },
		]);
	});

	it("gives the same letter to the same row the same id, so a second Send is dropped", async () => {
		await writeToWaitlist("admin", EXPERT, letter);
		await writeToWaitlist("admin", EXPERT, letter);
		await writeToWaitlist("admin", EXPERT, { ...letter, message: "Other." });

		const ids = vi
			.mocked(NovuService.send)
			.mock.calls.filter(([args]) => args.to.email === "anna@x.io")
			.map(([args]) => args.transactionId);
		expect(ids[0]).toBe(ids[1]);
		expect(ids[2]).not.toBe(ids[0]);
	});

	it("counts what Novu refused and records the send", async () => {
		vi.mocked(NovuService.send)
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("down"));

		await expect(writeToWaitlist("admin", EXPERT, letter)).resolves.toEqual({
			sent: 1,
			failed: 1,
		});
		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorUserId: "admin",
				entity: "feature-waitlist",
				entityId: EXPERT,
				meta: { title: letter.title, sent: 1, failed: 1 },
			}),
		});
	});
});
