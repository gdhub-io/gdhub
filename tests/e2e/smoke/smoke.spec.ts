import { type Browser, expect, type Page, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { PERSONAS } from "../../personas";
import { acceptCookieConsent } from "../setup/cookies";
import { allRoutes, type Persona } from "./routes";

/**
 * GDHUB-130: every page, as someone allowed and as someone refused. Routes and
 * access come from the code (./routes), so a new page needs nothing here unless
 * it takes a parameter worth a real value.
 */

const baseURL = () => process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/** A value for a route's parameter; a route with no value here is opened with a made-up one. */
const fixtures = async () => {
	const [project, course, event] = await Promise.all([
		prisma.project.findUniqueOrThrow({
			where: { slug: "project-of-author" },
			select: { slug: true },
		}),
		prisma.course.findUniqueOrThrow({
			where: { slug: "course-of-educator" },
			select: { id: true, slug: true },
		}),
		prisma.event.findFirstOrThrow({
			where: { title: "Pitch night (organiser)" },
			select: { id: true, slug: true },
		}),
	]);
	return new Map<string, string | null>([
		["/user/project/[slug]", project.slug],
		["/project/[projectSlug]", project.slug],
		["/user/course/[courseId]", course.id],
		["/course/[slug]", course.slug],
		["/hub/courses/[slug]", course.slug],
		["/user/event/[eventId]", event.id],
		["/event/[slug]", event.slug],
	]);
};

const MADE_UP = "smoke-missing";

/** Pages that need a query the smoke does not send; they 404 without it, on purpose. */
const NEEDS_QUERY = ["/checkpoint/new/checkout"];

/**
 * The address to open, and whether every parameter in it is real: a page opened
 * with a made-up one may fairly answer 404, and only a crash then counts.
 */
const addressOf = (path: string, known: Map<string, string | null>) => {
	let real = true;
	let soFar = "";
	const url = path
		.split("/")
		.map((segment) => {
			soFar = soFar ? `${soFar}/${segment}` : segment;
			if (segment.startsWith("[[...")) return "";
			if (!segment.startsWith("[")) return segment;
			const value = known.get(soFar);
			if (value) return value;
			real = false;
			return MADE_UP;
		})
		.filter((segment, index) => segment || index === 0)
		.join("/");
	return { url: url || "/", real: real && !NEEDS_QUERY.includes(path) };
};

const sessions = new Map<Persona, Awaited<ReturnType<typeof signedIn>>>();

const signedIn = async (browser: Browser, persona: Persona) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	await acceptCookieConsent(page, baseURL());
	if (persona !== "anonymous") {
		const { email } = PERSONAS.find((row) => row.key === persona) ?? {};
		if (!email) throw new Error(`No persona ${persona} in tests/personas.ts`);
		const { csrfToken } = (await (
			await page.request.get("/api/auth/csrf")
		).json()) as { csrfToken: string };
		const answer = await page.request.post(
			"/api/auth/callback/e2e-credentials",
			{ form: { csrfToken, email, callbackUrl: `${baseURL()}/hub`, json: "true" } },
		);
		expect(answer.ok(), `sign-in as ${persona}`).toBe(true);
	}
	await page.close();
	return context.storageState();
};

const pageAs = async (browser: Browser, persona: Persona) => {
	if (!sessions.has(persona)) {
		sessions.set(persona, await signedIn(browser, persona));
	}
	const context = await browser.newContext({
		baseURL: baseURL(),
		storageState: sessions.get(persona),
	});
	return context.newPage();
};

/** Opens a page and reports what a visitor got: the answer, where they landed, anything thrown. */
const open = async (page: Page, url: string) => {
	const thrown: string[] = [];
	page.on("pageerror", (error) => thrown.push(error.message));
	const response = await page.goto(url, { waitUntil: "domcontentloaded" });
	const crashed = await page
		.getByRole("heading", { name: "Something went wrong" })
		.isVisible();
	return {
		status: response?.status() ?? 0,
		landed: new URL(page.url()).pathname,
		crashed,
		thrown,
	};
};

const SENT_AWAY = /^\/(signin|registration)/;

let known: Map<string, string | null>;

test.beforeAll(async () => {
	known = await fixtures();
});

for (const route of allRoutes()) {
	test.describe(route.path, () => {
		for (const persona of route.allowed) {
			test(`opens for ${persona}`, async ({ browser }) => {
				const { url, real } = addressOf(route.path, known);
				const page = await pageAs(browser, persona);
				const got = await open(page, url);
				expect(got.status, `${url} as ${persona}`).toBeLessThan(500);
				expect(got.crashed, `error boundary on ${url}`).toBe(false);
				expect(got.thrown, `exception on ${url}`).toEqual([]);
				if (real) expect(got.status, `${url} as ${persona}`).not.toBe(404);
				await page.context().close();
			});
		}
		for (const persona of route.refused) {
			test(`refuses ${persona}`, async ({ browser }) => {
				const { url } = addressOf(route.path, known);
				const page = await pageAs(browser, persona);
				const got = await open(page, url);
				expect(got.status, `${url} as ${persona}`).toBeLessThan(500);
				expect(
					got.status === 404 || SENT_AWAY.test(got.landed),
					`${url} opened for ${persona}: ${got.status} at ${got.landed}`,
				).toBe(true);
				await page.context().close();
			});
		}
	});
}
