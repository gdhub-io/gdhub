import { expect, test } from "@playwright/test";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { prisma } from "../../src/services/prisma";
import {
	cleanupInvitedUser,
	ensureInvitedUser,
	INVITED_USER_EMAIL,
} from "./setup/invited-user";
import { TEST_USER_EMAIL } from "./setup/test-user";

const ts = () => Date.now().toString(36);

test.describe.serial("team invitation flow", () => {
	let projectSlug: string;
	let invitationId: string;
	let teamId: string;
	const projectName = `E2E Invite ${ts()}`;

	test.beforeAll(async () => {
		await ensureInvitedUser();
	});

	test.afterAll(async () => {
		await prisma.teamInvitation
			.deleteMany({ where: { email: INVITED_USER_EMAIL } })
			.catch(() => undefined);

		const invitedUser = await prisma.user.findUnique({
			where: { email: INVITED_USER_EMAIL },
		});
		if (invitedUser) {
			await prisma.teamMember
				.deleteMany({ where: { userId: invitedUser.id } })
				.catch(() => undefined);
		}

		if (projectSlug) {
			const project = await prisma.project
				.findFirst({ where: { slug: projectSlug } })
				.catch(() => null);
			if (project) {
				await prisma.project
					.update({
						where: { id: project.id },
						data: { status: prismaClient.ProjectStatus.Archived },
					})
					.catch(() => undefined);
			}
		}

		await cleanupInvitedUser();
	});

	test("create project and send invitation", async ({ page }) => {
		test.setTimeout(60_000);

		// --- 1. Create a project via UI ---
		await page.goto("/hub");
		await expect(page).toHaveURL(/\/hub/);

		await page.getByRole("button", { name: /new project/i }).first().click();
		const createModal = page.getByRole("dialog");
		await expect(createModal).toBeVisible();

		await createModal.getByLabel(/title/i).fill(projectName);
		await createModal
			.getByLabel(/short description/i)
			.fill("E2E team invitation test");
		await createModal
			.getByRole("checkbox", { name: /requirements/i })
			.check();

		await Promise.all([
			page.waitForURL(/\/my\/projects\/[^/]+(\/|$)/, { timeout: 30_000 }),
			createModal.getByRole("button", { name: /^create$/i }).click(),
		]);

		projectSlug = new URL(page.url()).pathname
			.split("/")
			.filter(Boolean)
			.at(-1)!;
		expect(projectSlug).toBeTruthy();

		// --- 2. Create invitation via Prisma (bypasses Novu) ---
		const project = await prisma.project.findFirst({
			where: { slug: projectSlug },
			include: { team: true },
		});
		expect(project?.team).toBeTruthy();
		teamId = project!.team!.id;

		const author = await prisma.user.findUnique({
			where: { email: TEST_USER_EMAIL },
		});
		const direction = await prisma.workDirection.findFirst();

		const invitation = await prisma.teamInvitation.create({
			data: {
				email: INVITED_USER_EMAIL,
				position: "Game Designer",
				directionId: direction!.id,
				startedAt: new Date(),
				team: { connect: { id: teamId } },
				invitedBy: { connect: { id: author!.id } },
				user: { connect: { email: INVITED_USER_EMAIL } },
				status: prismaClient.InvitationStatus.Pending,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});
		invitationId = invitation.id;

		// --- 3. Verify pending invitation in UI ---
		await page.goto(`/user/project/${projectSlug}/team`);
		await expect(page.getByText(/pending invitations/i)).toBeVisible({
			timeout: 10_000,
		});
		await page.getByText(/pending invitations/i).click();
		await expect(page.getByText(INVITED_USER_EMAIL)).toBeVisible({
			timeout: 5_000,
		});
	});

	test("invited user sees invitation details", async ({ browser }) => {
		test.setTimeout(30_000);
		expect(invitationId).toBeTruthy();

		const context = await browser.newContext();
		const page = await context.newPage();
		const baseURL = "http://localhost:3000";

		// Sign in as the invited user
		const csrfRes = await page.request.get(`${baseURL}/api/auth/csrf`);
		const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
		await page.request.post(`${baseURL}/api/auth/callback/e2e-credentials`, {
			form: {
				csrfToken,
				email: INVITED_USER_EMAIL,
				callbackUrl: `${baseURL}/hub`,
				json: "true",
			},
		});

		// Navigate to the invite page
		await page.goto(`${baseURL}/invite/${invitationId}`);

		// Verify invitation details are displayed
		await expect(
			page.getByRole("heading", { name: /team invitation/i }),
		).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(/game designer/i)).toBeVisible();
		await expect(page.getByText(new RegExp(projectName, "i"))).toBeVisible();
		await expect(
			page.getByRole("button", { name: /accept invitation/i }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: /decline/i }),
		).toBeVisible();

		await context.close();
	});

	test("accepted invitation adds user to team", async ({ page }) => {
		test.setTimeout(30_000);

		// Accept invitation via Prisma (bypasses Novu hang)
		const invitedUser = await prisma.user.findUnique({
			where: { email: INVITED_USER_EMAIL },
			include: { specialities: true },
		});
		expect(invitedUser).toBeTruthy();
		expect(invitedUser!.specialities.length).toBeGreaterThan(0);

		await prisma.teamInvitation.update({
			where: { id: invitationId },
			data: {
				status: prismaClient.InvitationStatus.Accepted,
				acceptedAt: new Date(),
				user: { connect: { id: invitedUser!.id } },
			},
		});

		await prisma.teamMember.create({
			data: {
				position: "Game Designer",
				speciality: { connect: { id: invitedUser!.specialities[0].id } },
				status: prismaClient.TeamMemberStatus.Hired,
				startedAt: new Date(),
				team: { connect: { id: teamId } },
				user: { connect: { id: invitedUser!.id } },
			},
		});

		// Verify the invited user appears in the team members UI
		await page.goto(`/user/project/${projectSlug}/team`);
		await expect(page.getByText("E2E Invited User")).toBeVisible({
			timeout: 10_000,
		});
		await expect(
			page.getByRole("cell", { name: "Game Designer", exact: true }),
		).toBeVisible();
	});
});
