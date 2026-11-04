import { InvitationStatus, TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../src/services/prisma";
import { GAME } from "./checkpoints/support/game";
import { createProjectInHub } from "./setup/project";
import {
	grantUser,
	removeRun,
	type StandUser,
	signInAs,
	signInPage,
} from "./setup/users";


test.describe.serial("team invitation flow", () => {
	let author: StandUser;
	let invited: StandUser;
	let projectSlug: string;
	let invitationId: string;
	let teamId: string;
	// A fixed name: the AI check of a new project then replays from a recording.
	const projectName = GAME.name;

	test.beforeAll(async () => {
		author = await grantUser("inviter");
		invited = await grantUser("invited", "member", "E2E Invited User");
	});
	test.afterAll(removeRun);

	test("create project and send invitation", async ({ page }) => {
		await signInPage(page, author);
		projectSlug = await createProjectInHub(
			page,
			projectName,
			GAME.description,
		);

		// The invitation is written directly: the app's route sends it through Novu.
		const project = await prisma.project.findFirstOrThrow({
			where: { slug: projectSlug },
			include: { team: true },
		});
		expect(project.team).toBeTruthy();
		teamId = project.team?.id ?? "";

		const direction = await prisma.workDirection.findFirstOrThrow();
		const invitation = await prisma.teamInvitation.create({
			data: {
				email: invited.email,
				position: "Game Designer",
				directionId: direction.id,
				startedAt: new Date(),
				teamId,
				invitedById: author.id,
				userId: invited.id,
				status: InvitationStatus.Pending,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});
		invitationId = invitation.id;

		await page.goto(`/user/project/${projectSlug}/team`);
		await expect(page.getByText(/pending invitations/i)).toBeVisible({
			timeout: 10_000,
		});
		await page.getByText(/pending invitations/i).click();
		await expect(page.getByText(invited.email)).toBeVisible();
	});

	test("invited user sees invitation details", async ({ browser }) => {
		expect(invitationId).toBeTruthy();
		const page = await signInAs(browser, invited);

		await page.goto(`/invite/${invitationId}`);
		await expect(
			page.getByRole("heading", { name: /team invitation/i }),
		).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(/game designer/i)).toBeVisible();
		await expect(page.getByText(new RegExp(projectName, "i"))).toBeVisible();
		await expect(
			page.getByRole("button", { name: /accept invitation/i }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: /decline/i })).toBeVisible();
	});

	test("accepted invitation adds user to team", async ({ page }) => {
		// Accepted directly: the app's route waits on Novu.
		const speciality = await prisma.speciality.findFirstOrThrow({
			where: { userId: invited.id },
			select: { id: true },
		});
		await prisma.teamInvitation.update({
			where: { id: invitationId },
			data: { status: InvitationStatus.Accepted, acceptedAt: new Date() },
		});
		await prisma.teamMember.create({
			data: {
				position: "Game Designer",
				specialityId: speciality.id,
				status: TeamMemberStatus.Hired,
				startedAt: new Date(),
				teamId,
				userId: invited.id,
			},
		});

		await signInPage(page, author);
		await page.goto(`/user/project/${projectSlug}/team`);
		await expect(page.getByText(invited.name)).toBeVisible({
			timeout: 10_000,
		});
		await expect(
			page.getByRole("cell", { name: "Game Designer", exact: true }),
		).toBeVisible();
	});
});
