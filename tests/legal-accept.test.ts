import { describe, expect, it, vi } from "vitest";
import { LEGAL_DOCUMENTS } from "@/config/legal/registry";
import { acceptLegal, LegalError } from "@/lib/legal/accept";

const now = new Date("2026-11-01T00:00:00Z");
const meta = { ipAddress: "192.0.2.1", userAgent: "vitest" };

const tx = () => {
	const createMany = vi.fn().mockResolvedValue({ count: 0 });
	return { client: { legalAcceptance: { createMany } }, createMany };
};

const reasonOf = async (p: Promise<unknown>) => {
	try {
		await p;
	} catch (e) {
		return e instanceof LegalError ? `${e.reason}:${e.code}` : String(e);
	}
	return "accepted";
};

describe("acceptLegal", () => {
	it("writes one row per required document, with the registry checksum", async () => {
		const { client, createMany } = tx();
		await acceptLegal(
			client,
			[
				{ code: "CheckpointPurchaseTerms", version: 1 },
				{ code: "TermsOfUse", version: 1 },
			],
			["CheckpointPurchaseTerms"],
			{ userId: "u1", context: "CheckpointPurchase", checkpointId: "cp1", meta, now },
		);
		const rows = createMany.mock.calls[0][0].data;
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			userId: "u1",
			code: "CheckpointPurchaseTerms",
			version: 1,
			checksum: LEGAL_DOCUMENTS.CheckpointPurchaseTerms.versions[0].checksum,
			context: "CheckpointPurchase",
			checkpointId: "cp1",
			projectId: null,
			ipAddress: "192.0.2.1",
		});
	});

	it("refuses when a required box was not ticked, and writes nothing", async () => {
		const { client, createMany } = tx();
		const reason = await reasonOf(
			acceptLegal(client, [{ code: "TermsOfUse", version: 1 }], ["TermsOfUse", "ProjectRequirements"], {
				userId: "u1",
				context: "ProjectCreate",
				meta,
				now,
			}),
		);
		expect(reason).toBe("required:ProjectRequirements");
		expect(createMany).not.toHaveBeenCalled();
	});

	it("refuses a version other than the one in effect", async () => {
		const { client } = tx();
		expect(
			await reasonOf(
				acceptLegal(client, [{ code: "TermsOfUse", version: 2 }], ["TermsOfUse"], {
					userId: "u1",
					context: "SignUp",
					meta,
					now,
				}),
			),
		).toBe("outdated:TermsOfUse");
	});

	it("refuses a document with no version in effect yet", async () => {
		const { client } = tx();
		expect(
			await reasonOf(
				acceptLegal(client, [{ code: "TermsOfUse", version: 1 }], ["TermsOfUse"], {
					userId: "u1",
					context: "SignUp",
					meta,
					now: new Date("2026-01-01T00:00:00Z"),
				}),
			),
		).toBe("unpublished:TermsOfUse");
		expect(
			await reasonOf(
				acceptLegal(client, [{ code: "ExpertServicesTerms", version: 1 }], ["ExpertServicesTerms"], {
					userId: "u1",
					context: "ExpertServices",
					meta,
					now,
				}),
			),
		).toBe("unpublished:ExpertServicesTerms");
	});
});
