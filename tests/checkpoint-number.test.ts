import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { describe, expect, it, vi } from "vitest";
import {
	checkpointNumber,
	checkpointNumbers,
} from "@/repositories/checkpoint-number";
import { prisma } from "@/services/prisma";

type Row = {
	id: string;
	projectId: string;
	createdAt: Date;
	status: CheckpointStatus;
};

type Where = {
	projectId?: string | { in: string[] };
	createdAt?: { lt: Date };
	status?: { notIn: CheckpointStatus[] };
};

vi.mock("@/services/prisma", () => ({
	prisma: { projectCheckpoint: { count: vi.fn(), findMany: vi.fn() } },
}));

const at = (day: number) => new Date(Date.UTC(2026, 0, day));

const rows: Row[] = [
	{ id: "a1", projectId: "a", createdAt: at(1), status: CheckpointStatus.Closed },
	{ id: "a2", projectId: "a", createdAt: at(2), status: CheckpointStatus.Draft },
	{ id: "a3", projectId: "a", createdAt: at(3), status: CheckpointStatus.Cancelled },
	{ id: "a4", projectId: "a", createdAt: at(4), status: CheckpointStatus.Closed },
	// Same moment as a4: neither counts the other.
	{ id: "a5", projectId: "a", createdAt: at(4), status: CheckpointStatus.Active },
	{ id: "a6", projectId: "a", createdAt: at(6), status: CheckpointStatus.Draft },
	{ id: "b1", projectId: "b", createdAt: at(2), status: CheckpointStatus.Review },
	{ id: "b2", projectId: "b", createdAt: at(5), status: CheckpointStatus.AwaitingCurator },
];

/** The where clauses both functions send, applied to the rows above as Postgres would. */
const matches = (row: Row, where: Where) =>
	(typeof where.projectId === "string"
		? row.projectId === where.projectId
		: !where.projectId || where.projectId.in.includes(row.projectId)) &&
	(!where.createdAt || row.createdAt < where.createdAt.lt) &&
	(!where.status || !where.status.notIn.includes(row.status));

vi.mocked(prisma.projectCheckpoint.count).mockImplementation((async ({
	where,
}: {
	where: Where;
}) => rows.filter((row) => matches(row, where)).length) as never);
vi.mocked(prisma.projectCheckpoint.findMany).mockImplementation((async ({
	where,
}: {
	where: Where;
}) => rows.filter((row) => matches(row, where))) as never);

describe("numbering checkpoints in one query", () => {
	it("gives every row the number checkpointNumber gives it", async () => {
		const batch = await checkpointNumbers(rows);
		const single = await Promise.all(rows.map((row) => checkpointNumber(row)));

		expect(rows.map((row) => batch.get(row.id))).toEqual(single);
		expect(single).toEqual([1, 2, 2, 2, 2, 4, 1, 2]);
		expect(prisma.projectCheckpoint.findMany).toHaveBeenCalledTimes(1);
	});

	it("asks nothing for no rows", async () => {
		vi.mocked(prisma.projectCheckpoint.findMany).mockClear();
		await expect(checkpointNumbers([])).resolves.toEqual(new Map());
		expect(prisma.projectCheckpoint.findMany).not.toHaveBeenCalled();
	});
});
