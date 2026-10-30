import { beforeEach, describe, expect, it, vi } from "vitest";

const reportFindMany = vi.fn();
const getApplauseCounts = vi.fn();
const projectFindUnique = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectReport: {
			findMany: (...a: unknown[]) => reportFindMany(...a),
			getApplauseCounts: (...a: unknown[]) => getApplauseCounts(...a),
		},
		project: { findUnique: (...a: unknown[]) => projectFindUnique(...a) },
	},
}));

const { lensWeights } = await import("@/lib/checkpoints/lenses");
const { renderMarketing, renderWorkflow } = await import(
	"@/services/checkpoints/ai-curator/prompts/card"
);
const { curatorMarketing } = await import(
	"@/repositories/checkpoints/ai-curator-context"
);

beforeEach(() => vi.clearAllMocks());

// GDHUB-126: how much each lens says is set per stage, in config.
describe("lens weights", () => {
	it("weighs marketing low on Ideation and high on the demo", () => {
		expect(lensWeights("Ideation").marketing).toBe("low");
		expect(lensWeights("Preparing a demo version").marketing).toBe("high");
	});

	it("leaves a stage the config does not name at normal", () => {
		expect(lensWeights("A stage of our own")).toEqual({
			development: "normal",
			marketing: "normal",
			team: "normal",
			management: "normal",
		});
	});

	it("reaches the model with the stage", () => {
		const text = renderWorkflow({
			currentStage: "Ideation",
			nextStage: null,
			description: null,
			goal: null,
			lenses: lensWeights("Ideation"),
			requiredTasks: [],
		});
		expect(text).toContain(
			"Lens weights on this stage: development low, marketing low, team normal, management normal.",
		);
	});
});

describe("the marketing lens", () => {
	const period = {
		from: new Date("2026-10-01T00:00:00Z"),
		to: new Date("2026-10-08T00:00:00Z"),
	};

	it("reads the period's public devlogs with their applause and views", async () => {
		reportFindMany.mockResolvedValue([
			{
				id: "r4",
				number: 4,
				content: "\nThe first island floods\nMore below.",
				contentEditor: null,
				publishedAt: new Date("2026-10-07T10:00:00Z"),
				viewsCount: 58,
			},
		]);
		getApplauseCounts.mockResolvedValue(new Map([["r4", 6]]));
		projectFindUnique.mockResolvedValue({
			links: [
				{ platform: "itch.io", link: "https://x.itch.io/game" },
				{ platform: "Steam", link: "" },
			],
		});

		const marketing = await curatorMarketing("p1", period);

		// The sprint's last day and the morning after count, as in `sprintEvidence`.
		expect(reportFindMany.mock.calls[0][0].where).toEqual({
			projectId: "p1",
			isSystem: false,
			publishedAt: { gte: period.from, lt: new Date("2026-10-09T00:00:00Z") },
		});
		expect(marketing).toEqual({
			devlogs: [
				{
					title: "Devlog #4: The first island floods",
					publishedAt: "2026-10-07",
					applause: 6,
					views: 58,
				},
			],
			// A link without an address says nothing.
			links: ["itch.io: https://x.itch.io/game"],
		});
	});

	it("says plainly when the audience was told nothing", () => {
		expect(renderMarketing({ devlogs: [], links: [] })).toBe(
			"No public devlog in the period.\nThe project lists no store page or link.",
		);
	});
});
