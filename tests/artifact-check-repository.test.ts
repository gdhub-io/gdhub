import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkArtifact,
	sweepArtifactChecks,
} from "@/repositories/project/artifact-check";
import { openLink } from "@/services/artifact-check/safe-fetch";
import { prisma } from "@/services/prisma";

vi.mock("@/services/artifact-check/safe-fetch", () => ({ openLink: vi.fn() }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectArtifact: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
		},
	},
}));

const update = prisma.projectArtifact.update as ReturnType<typeof vi.fn>;
const findUnique = prisma.projectArtifact.findUnique as ReturnType<
	typeof vi.fn
>;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("checking one artifact", () => {
	it("marks a link that opens as Ready and clears the old reason", async () => {
		findUnique.mockResolvedValue({ link: "https://youtu.be/x" });
		vi.mocked(openLink).mockResolvedValue({ ok: true });

		await checkArtifact("a1");

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "a1" },
				data: expect.objectContaining({
					checkStatus: "Readable",
					checkNote: null,
				}),
			}),
		);
	});

	it("keeps the reason when the link does not open", async () => {
		findUnique.mockResolvedValue({ link: "https://drive.google.com/x" });
		vi.mocked(openLink).mockResolvedValue({ ok: false, reason: "needsLogin" });

		await checkArtifact("a1");

		expect(update.mock.calls[0][0].data).toMatchObject({
			checkStatus: "Unreachable",
			checkNote: "needsLogin",
		});
	});

	it("takes our own uploads as Ready without fetching them", async () => {
		findUnique.mockResolvedValue({
			link: "https://cdn.sanity.io/images/p/production/abc.png",
		});

		await checkArtifact("a1");

		expect(openLink).not.toHaveBeenCalled();
		expect(update.mock.calls[0][0].data.checkStatus).toBe("Readable");
	});
});

describe("the cron's sweep", () => {
	it("never reaches artifacts of closed checkpoints", async () => {
		vi.mocked(prisma.projectArtifact.findMany).mockResolvedValue([]);

		await sweepArtifactChecks();

		const { where } = vi.mocked(prisma.projectArtifact.findMany).mock
			.calls[0][0] as { where: { OR: Record<string, unknown>[] } };
		const unchecked = where.OR[1] as {
			checkpointEvidence: {
				some: { item: { checkpoint: { status: { in: string[] } } } };
			};
		};
		const { status } = unchecked.checkpointEvidence.some.item.checkpoint;
		expect(status.in).not.toContain("Closed");
		expect(status.in).toContain("Active");
	});
});
