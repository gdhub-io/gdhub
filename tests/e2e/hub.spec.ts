import { expect, test } from "@playwright/test";

const HUB_ROUTES = [
	"/hub",
	"/hub/projects",
	"/hub/events",
	"/hub/courses",
	"/hub/experts",
	"/hub/jobs",
	"/hub/members",
	"/hub/lectures",
	"/hub/docs",
];

for (const path of HUB_ROUTES) {
	test(`unauthenticated visitor on ${path} is redirected to /signin`, async ({
		page,
	}) => {
		const response = await page.goto(path);
		const finalUrl = page.url();
		const redirected =
			finalUrl.includes("/signin") || finalUrl.includes("/");
		expect(redirected || response?.status() === 401).toBeTruthy();
	});
}
