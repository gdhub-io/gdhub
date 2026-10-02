/**
 * "Hollow Tide — Devlog #15": what a post is called wherever it leaves the site
 * — the page title, the share text, the OG card. A system post has no number
 * and is just "Devlog".
 */
export const devlogTitle = (projectName: string, number?: number | null) =>
	`${projectName} — ${number ? `Devlog #${number}` : "Devlog"}`;
