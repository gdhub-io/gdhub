import { expect, test } from "@playwright/test";

const ADMIN_ROUTES = [
	"/admin/users",
	"/admin/posts",
	"/admin/devlog-posts",
	"/admin/workflows",
	"/admin/audit-logs",
	"/admin/post/__missing__",
	"/admin/workflow/__missing__",
	"/admin/project-workflow/__missing__",
];

for (const path of ADMIN_ROUTES) {
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

test("/sitemap.xml is served", async ({ request }) => {
	const response = await request.get("/sitemap.xml");
	expect(response.ok()).toBeTruthy();
	const body = await response.text();
	expect(body).toContain("<?xml");
});
