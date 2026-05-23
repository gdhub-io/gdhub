import { expect, test } from "@playwright/test";

const PROTECTED_ROUTES = [
	"/profile",
	"/profile/settings/general",
	"/my/projects/__no__",
	"/my/projects/__no__/team",
	"/my/projects/__no__/vacancies",
	"/my/projects/__no__/workflow",
	"/my/projects/__no__/devlog",
	"/my/projects/__no__/documents",
	"/my/projects/__no__/settings",
	"/my/events/__no__",
	"/my/events/__no__/content",
	"/my/events/__no__/members",
	"/my/events/__no__/schedule",
	"/my/events/__no__/settings",
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
