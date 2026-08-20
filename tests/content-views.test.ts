import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordContentViews } from "../src/repositories/content-view.repository";
import { prisma } from "../src/services/prisma";

const tx = {
	projectReport: {
		updateMany: vi.fn(),
	},
	contentView: {
		createManyAndReturn: vi.fn(),
		updateMany: vi.fn(),
	},
};

vi.mock("../src/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		// The existence check runs outside the transaction, on the root client.
		projectReport: { findMany: vi.fn() },
	},
}));

vi.mock("@gdhub-io/gdhub-prisma", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		withAuditContext: vi.fn((_context: unknown, run: () => unknown) => run()),
	};
});

const { withAuditContext } = await import("@gdhub-io/gdhub-prisma");

const VIEWED_ON = new Date("2026-08-20T00:00:00.000Z");

const record = (ids: string[], source: "feed" | "page" = "feed") =>
	recordContentViews({
		subjectType: "ProjectReport",
		ids,
		viewerKey: "viewer-1",
		viewedOn: VIEWED_ON,
		source,
	});

describe("recordContentViews", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(prisma.$transaction as any).mockImplementation((fn: any) => fn(tx));
		(prisma.projectReport.findMany as any).mockResolvedValue([
			{ id: "a" },
			{ id: "b" },
		]);
		tx.contentView.createManyAndReturn.mockResolvedValue([]);
	});

	it("counts a subject once per viewer per day", async () => {
		tx.contentView.createManyAndReturn.mockResolvedValue([{ subjectId: "a" }]);

		const recorded = await record(["a", "b"]);

		// "b" lost the unique index to a row the viewer already owned today.
		expect(recorded).toBe(1);
		expect(tx.projectReport.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["a"] } },
			data: { viewsCount: { increment: 1 } },
		});
	});

	it("leaves the counter alone when nothing was new", async () => {
		const recorded = await record(["a", "b"]);

		expect(recorded).toBe(0);
		expect(tx.projectReport.updateMany).not.toHaveBeenCalled();
	});

	it("remembers that an already-counted view also happened on the page", async () => {
		await record(["a", "b"], "page");

		expect(tx.contentView.updateMany).toHaveBeenCalledWith({
			where: {
				subjectType: "ProjectReport",
				subjectId: { in: ["a", "b"] },
				viewerKey: "viewer-1",
				viewedOn: VIEWED_ON,
				fromPage: false,
			},
			data: { fromPage: true },
		});
	});

	it("does not touch rows that were just created", async () => {
		tx.contentView.createManyAndReturn.mockResolvedValue([
			{ subjectId: "a" },
			{ subjectId: "b" },
		]);

		await record(["a", "b"]);

		expect(tx.contentView.updateMany).not.toHaveBeenCalled();
	});

	it("drops ids the caller made up rather than counting them", async () => {
		(prisma.projectReport.findMany as any).mockResolvedValue([{ id: "a" }]);
		tx.contentView.createManyAndReturn.mockResolvedValue([{ subjectId: "a" }]);

		await record(["a", "ghost"]);

		expect(tx.contentView.createManyAndReturn).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [expect.objectContaining({ subjectId: "a" })],
			}),
		);
	});

	it("opens no transaction when none of the ids exist", async () => {
		(prisma.projectReport.findMany as any).mockResolvedValue([]);

		expect(await record(["ghost"])).toBe(0);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it("marks the source the view came from", async () => {
		(prisma.projectReport.findMany as any).mockResolvedValue([{ id: "a" }]);

		await record(["a"], "page");

		expect(tx.contentView.createManyAndReturn).toHaveBeenCalledWith(
			expect.objectContaining({
				skipDuplicates: true,
				data: [expect.objectContaining({ fromFeed: false, fromPage: true })],
			}),
		);
	});

	it("keeps the counter bump out of the audit log", async () => {
		// Every subject model is audited, so an unsuppressed bump would write an
		// AuditLog row — and re-read the rows — on every recorded view.
		await record(["a"]);

		expect(withAuditContext).toHaveBeenCalledWith(
			expect.objectContaining({ suppressAudit: true }),
			expect.any(Function),
		);
	});
});
