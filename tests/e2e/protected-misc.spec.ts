import { expect, test } from "@playwright/test";

const PROTECTED_ROUTES = [
	"/profile",
	"/user/settings/general",
	"/user/courses",
	"/user/events",
	"/user/advice-requests",
	"/user/course/__no__",
	"/user/project/__no__",
	"/user/project/__no__/team",
	"/user/project/__no__/open-positions",
	"/user/project/__no__/workflow",
	"/user/project/__no__/devlog",
	"/user/project/__no__/artifacts",
	"/user/project/__no__/settings",
	"/user/event/__no__",
	"/user/event/__no__/content",
	"/user/event/__no__/members",
	"/user/event/__no__/schedule",
	"/user/event/__no__/settings",
	"/live/room/reports",
];

for (const path of PROTECTED_ROUTES) {
	test(`unauthenticated visitor on ${path} is redirected away`, async ({
		page,
	}) => {
		const response = await page.goto(path);
		const finalUrl = page.url();
		const redirected =
			finalUrl.includes("/signin") || finalUrl === new URL("/", finalUrl).href;
		expect(
			redirected || response?.status() === 401 || response?.status() === 404,
		).toBeTruthy();
	});
}
