import { UserRole } from "@gdhub-io/gdhub-prisma";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { becomePersona, type PersonaKey } from "../../personas";
import { acceptCookieConsent } from "./cookies";
import { acceptTermsOfUse } from "./legal";
import { baseURL, signIn } from "./sign-in";

/**
 * Every user a spec needs is made here under one run id and removed by
 * `removeRun`, so specs never share rows and a failed run leaves nothing a
 * later one trips over.
 */

export const RUN = Date.now().toString(36);
// Paddle refuses a `.local` address; example.com is reserved and delivers nothing.
const PREFIX = "cp-e2e-";
const DOMAIN = "example.com";
const contexts: BrowserContext[] = [];

export type StandUser = { id: string; email: string; name: string };

export async function grantUser(
	label: string,
	persona: PersonaKey = "member",
	name = `${label[0].toUpperCase()}${label.slice(1)} E2E`,
): Promise<StandUser> {
	const email = `${PREFIX}${label}-${RUN}@${DOMAIN}`;
	const user = await prisma.user.create({
		data: {
			email,
			name,
			emailVerified: new Date(),
			onboardingDone: true,
			roles: [UserRole.Member],
			// A stub, so the JWT callback skips ensureMatrixUser.
			matrixUserId: `@${label}-${RUN}:matrix.local`,
			// Old enough to buy: a checkpoint is sold at 18.
			profile: { create: { name, yearOfBirth: 1990 } },
		},
		select: { id: true, email: true, name: true },
	});
	await becomePersona(user.id, persona);
	await acceptTermsOfUse(user.id);

	return { id: user.id, email, name };
}

/** Signs the page's context in as the user, past the cookie banner. */
export async function signInPage(page: Page, user: Pick<StandUser, "email">) {
	await acceptCookieConsent(page, baseURL());
	await signIn(page, user.email);
}

export async function signInAs(browser: Browser, user: StandUser) {
	const context = await browser.newContext({ baseURL: baseURL() });
	contexts.push(context);
	const page = await context.newPage();
	await signInPage(page, user);

	return page;
}

/**
 * Someone who has just confirmed their email: a user row and nothing else —
 * no name, no profile, no onboarding, no terms accepted yet.
 */
export async function signUp(browser: Browser, label: string) {
	const user = await prisma.user.create({
		data: {
			email: `${PREFIX}${label}-${RUN}@${DOMAIN}`,
			emailVerified: new Date(),
			matrixUserId: `@${label}-${RUN}:matrix.local`,
		},
		select: { id: true, email: true },
	});

	return signInAs(browser, { ...user, email: user.email ?? "", name: "" });
}

/**
 * Everything this run made — and whatever an interrupted run left over an
 * hour ago. Not the app's `deleteProject`: it refuses a project with vested
 * equity or a team history, which is exactly what these flows leave.
 */
export async function removeRun() {
	await Promise.all(contexts.splice(0).map((context) => context.close()));

	const users = await prisma.user.findMany({
		where: {
			email: { startsWith: PREFIX, endsWith: `@${DOMAIN}` },
			OR: [
				{ email: { contains: `-${RUN}@` } },
				{ createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
			],
		},
		select: { id: true },
	});
	const ids = users.map((user) => user.id);
	if (ids.length === 0) return;

	// A curator's fees, payouts and requests hold the user; they go first.
	await prisma.checkpointFee.deleteMany({ where: { curatorId: { in: ids } } });
	await prisma.adviceRequest.deleteMany({
		where: { OR: [{ toUserId: { in: ids } }, { fromUserId: { in: ids } }] },
	});
	await prisma.curatorPayout.deleteMany({
		where: { OR: [{ curatorId: { in: ids } }, { paidById: { in: ids } }] },
	});

	const ofTheirProjects = { equity: { project: { authorId: { in: ids } } } };
	// Equity is Restrict on the project and its transactions on the
	// allocations, so they go first.
	await prisma.equityTransaction.deleteMany({
		where: {
			OR: [
				{ toAllocation: ofTheirProjects },
				{ fromAllocation: ofTheirProjects },
			],
		},
	});
	await prisma.projectEquity.deleteMany({
		where: { project: { authorId: { in: ids } } },
	});
	await prisma.project.deleteMany({ where: { authorId: { in: ids } } });
	await prisma.certificate.deleteMany({ where: { userId: { in: ids } } });
	await prisma.refund.deleteMany({
		where: { payment: { payerId: { in: ids } } },
	});
	await prisma.payment.deleteMany({ where: { payerId: { in: ids } } });
	await prisma.legalAcceptance.deleteMany({ where: { userId: { in: ids } } });
	await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
