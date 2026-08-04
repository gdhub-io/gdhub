import { chromium } from "@playwright/test";

const STORIES = [
	"pages-onboarding--welcome",
	"pages-onboarding--profile-step",
	"pages-onboarding--profile-step-filled",
	"pages-onboarding--speciality-step",
	"pages-onboarding--speciality-step-empty",
	"pages-onboarding--interests-step",
	"pages-onboarding--resources-step",
	"pages-onboarding--completed",
	"pages-onboarding--completed-with-invitation",
	"pages-onboarding--error",
];

const run = async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await ctx.newPage();
	const errors: string[] = [];

	page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(`[console] ${m.text().slice(0, 200)}`);
	});

	for (const id of STORIES) {
		errors.length = 0;
		await page.goto(`http://localhost:6006/iframe.html?id=${id}&viewMode=story`, {
			waitUntil: "networkidle",
		});
		await page.waitForTimeout(800);
		const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 220);
		await page.screenshot({ path: `/tmp/sb-${id}.png`, fullPage: true });
		console.log(`\n### ${id}\n${text}`);
		if (errors.length) console.log(`ERRORS: ${errors.slice(0, 4).join(" | ")}`);
	}

	await browser.close();
};

run();
