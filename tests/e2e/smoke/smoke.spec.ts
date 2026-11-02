import { type Browser, expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { eventTitleFor, PERSONAS, slugFor } from "../../personas";
import { acceptCookieConsent } from "../setup/cookies";
import { baseURL, signIn } from "../setup/sign-in";
import { addressOf, allRoutes, type Persona } from "./routes";

/**
 * GDHUB-130: every page, as someone allowed and as someone refused. Routes and
 * access come from the code (./routes), so a new page needs nothing here unless
 * it takes a parameter worth a real value.
 */

/** A value for a route's parameter; a route with no value here is opened with a made-up one. */
const fixtures = async () => {
	const [project, course, event] = await Promise.all([
		prisma.project.findUniqueOrThrow({
			where: { slug: slugFor("author", "project") },
			select: { slug: true },
		}),
		prisma.course.findUniqueOrThrow({
			where: { slug: slugFor("educator", "course") },
			select: { id: true, slug: true },
		}),
		prisma.event.findFirstOrThrow({
			where: { title: eventTitleFor("organiser") },
			select: { id: true, slug: true },
		}),
	]);
	const values: [string, string | null][] = [
		["/user/project/[slug]", project.slug],
		["/project/[projectSlug]", project.slug],
		["/user/course/[courseId]", course.id],
		["/course/[slug]", course.slug],
		["/hub/courses/[slug]", course.slug],
		["/user/event/[eventId]", event.id],
		["/event/[slug]", event.slug],
	];
	return new Map(
		values.filter((row): row is [string, string] => row[1] !== null),
	);
};

const sessions = new Map<Persona, Awaited<ReturnType<typeof signedIn>>>();

const signedIn = async (browser: Browser, persona: Persona) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	await acceptCookieConsent(page, baseURL());
	if (persona !== "anonymous") {
		const { email } = PERSONAS.find((row) => row.key === persona) ?? {};
		if (!email) throw new Error(`No persona ${persona} in tests/personas.ts`);
		await signIn(page, email);
	}
	const state = await context.storageState();
	await context.close();
	return state;
};

/** Opens a page as the persona and reports what they got: the answer, where they landed, anything thrown. */
const visit = async (browser: Browser, persona: Persona, url: string) => {
	if (!sessions.has(persona)) {
		sessions.set(persona, await signedIn(browser, persona));
	}
	const context = await browser.newContext({
		storageState: sessions.get(persona),
	});
	const page = await context.newPage();
	const thrown: string[] = [];
	page.on("pageerror", (error) => thrown.push(error.message));
	const response = await page.goto(url, { waitUntil: "domcontentloaded" });
	const got = {
		status: response?.status() ?? 0,
		landed: new URL(page.url()).pathname,
		crashed: await page
			.getByRole("heading", { name: "Something went wrong" })
			.isVisible(),
		thrown,
	};
	await context.close();
	expect(got.status, `${url} as ${persona}`).toBeLessThan(500);
	return got;
};

const SENT_AWAY = /^\/(signin|registration)/;

let known: Map<string, string>;

test.beforeAll(async () => {
	known = await fixtures();
});

for (const route of allRoutes()) {
	test.describe(route.path, () => {
		for (const persona of route.allowed) {
			test(`opens for ${persona}`, async ({ browser }) => {
				const { url, real } = addressOf(route.path, known);
				const got = await visit(browser, persona, url);
				expect(got.crashed, `error boundary on ${url}`).toBe(false);
				expect(got.thrown, `exception on ${url}`).toEqual([]);
				if (real) expect(got.status, `${url} as ${persona}`).not.toBe(404);
			});
		}
		for (const persona of route.refused) {
			test(`refuses ${persona}`, async ({ browser }) => {
				const { url } = addressOf(route.path, known);
				const got = await visit(browser, persona, url);
				expect(
					got.status === 404 || SENT_AWAY.test(got.landed),
					`${url} opened for ${persona}: ${got.status} at ${got.landed}`,
				).toBe(true);
			});
		}
	});
}
