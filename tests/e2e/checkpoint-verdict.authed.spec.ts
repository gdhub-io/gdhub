import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { dueDateFrom } from "../../src/lib/checkpoints/days";
import { prisma } from "../../src/services/prisma";
import { ensurePersona, PERSONAS } from "../personas";
import { acceptCookieConsent } from "./setup/cookies";

/**
 * GDHUB-77, the two flows that must not break: the human curator drafts and
 * sends the verdict, and the author reads it and chooses how to go on.
 *
 * The checkpoint is built here, 35 days old so the final call has passed, on a
 * seeded project with a workflow, and removed afterwards. The curator is the
 * advisor persona; the author is whoever owns that project.
 */

const REASONING =
	"Two of three outcomes are proven. The playtest video moves to the next checkpoint.";

const signInAs = async (browser: Browser, email: string) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	const baseURL = test.info().project.use.baseURL ?? "http://localhost:3000";
	await acceptCookieConsent(page, baseURL);

	const { csrfToken } = (await (
		await page.request.get(`${baseURL}/api/auth/csrf`)
	).json()) as { csrfToken: string };
	await page.request.post(`${baseURL}/api/auth/callback/e2e-credentials`, {
		form: { csrfToken, email, callbackUrl: `${baseURL}/hub`, json: "true" },
	});

	return page;
};

test.describe.serial("checkpoint verdict", () => {
	let checkpointId: string;
	let projectSlug: string;
	let authorEmail: string;
	let curatorEmail: string;

	test.beforeAll(async () => {
		const advisor = PERSONAS.find((persona) => persona.key === "advisor");
		if (!advisor) throw new Error("No advisor persona");
		const curator = await ensurePersona(advisor);
		curatorEmail = advisor.email;

		// A project with a stage to put the checkpoint on and nothing under way.
		const project = await prisma.project.findFirst({
			where: {
				workflow: { currentStepId: { not: null } },
				author: { email: { not: null } },
				checkpoints: {
					none: {
						status: {
							in: [
								CheckpointStatus.Draft,
								CheckpointStatus.AwaitingCurator,
								CheckpointStatus.Active,
								CheckpointStatus.Review,
							],
						},
					},
				},
			},
			select: {
				id: true,
				slug: true,
				author: { select: { email: true } },
				workflow: {
					select: { currentStep: { select: { id: true, name: true } } },
				},
			},
		});
		const step = project?.workflow?.currentStep;
		if (!project?.author.email || !step)
			throw new Error("No seeded project with a workflow. Run test-env up.");

		projectSlug = project.slug;
		authorEmail = project.author.email;

		const taken = await prisma.projectCheckpoint.aggregate({
			where: { stepId: step.id },
			_max: { order: true },
		});
		const startedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

		const checkpoint = await prisma.projectCheckpoint.create({
			data: {
				projectId: project.id,
				stepId: step.id,
				stageName: step.name,
				order: (taken._max.order ?? 0) + 1,
				curatorKind: CheckpointCuratorKind.Human,
				curatorId: curator.id,
				curatorAcceptedAt: startedAt,
				status: CheckpointStatus.Review,
				goal: "A playable slice a stranger can finish in 15 minutes.",
				startedAt,
				dueAt: dueDateFrom(startedAt),
				items: {
					create: [
						{
							kind: CheckpointItemKind.Outcome,
							order: 0,
							text: "A 15-minute build",
						},
						{
							kind: CheckpointItemKind.Outcome,
							order: 1,
							text: "A playtest video",
						},
					],
				},
			},
			select: { id: true },
		});
		checkpointId = checkpoint.id;
	});

	test.afterAll(async () => {
		if (checkpointId)
			await prisma.projectCheckpoint
				.delete({ where: { id: checkpointId } })
				.catch(() => undefined);
	});

	test("the curator drafts the verdict and sends it", async ({ browser }) => {
		test.setTimeout(90_000);
		const page = await signInAs(browser, curatorEmail);

		await page.goto("/advisor/checkpoints");
		await expect(page.getByText(/verdict overdue/i).first()).toBeVisible({
			timeout: 30_000,
		});
		await page.getByRole("button", { name: "Write the verdict" }).click();

		const modal = page.getByRole("dialog", { name: /write the verdict/i });
		await expect(modal.getByText("A playtest video")).toBeVisible();

		await modal.getByText("Goal missed", { exact: true }).click();
		await modal.getByRole("textbox").fill(REASONING);
		await modal.getByRole("button", { name: "Save draft" }).click();
		await expect(page.getByText("Draft saved").first()).toBeVisible();

		// The draft is the curator's: it comes back when the modal opens again.
		await modal.getByRole("button", { name: "Close" }).click();
		await page.getByRole("button", { name: "Write the verdict" }).click();
		await expect(modal.getByRole("textbox")).toHaveValue(REASONING);

		await modal.getByRole("button", { name: "Send the verdict" }).click();
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /^(ok|send)/i })
			.last()
			.click();
		await expect(page.getByText("The verdict is sent").first()).toBeVisible();

		const closed = await prisma.projectCheckpoint.findUniqueOrThrow({
			where: { id: checkpointId },
		});
		expect(closed).toMatchObject({
			status: CheckpointStatus.Closed,
			verdict: CheckpointVerdict.GoalMissed,
			verdictNote: REASONING,
			verdictDraft: null,
			verdictDraftNote: null,
		});

		await page.context().close();
	});

	test("the author reads the verdict and chooses how to go on", async ({
		browser,
	}) => {
		test.setTimeout(90_000);
		const page: Page = await signInAs(browser, authorEmail);

		// The author's notification links here.
		await page.goto(
			`/user/project/${projectSlug}/workflow?results=${checkpointId}`,
		);
		const results = page.getByRole("dialog", { name: /results/i });
		await expect(results.getByText(REASONING)).toBeVisible({
			timeout: 30_000,
		});
		await expect(
			results.getByText(
				"Outcomes are incomplete. Continue with a new checkpoint.",
			),
		).toBeVisible();
		await results.getByRole("button", { name: "Close" }).click();

		await expect(page.getByText("How do you go on?")).toBeVisible();
		await page
			.getByRole("button", { name: "Continue with stage tasks" })
			.click();
		await expect(page.getByText("How do you go on?")).toBeHidden();

		await page.context().close();
	});
});
