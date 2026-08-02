/**
 * Prints which database a script is about to touch.
 *
 * These scripts are run by hand with `-e .env.production`, and the difference
 * between the right and the wrong environment file is one word. Naming the
 * target in the first line of output makes a mistyped flag obvious before the
 * writes rather than after them.
 *
 * Credentials are never printed — only host, port and database name.
 */
export function announceDbTarget(action: string): void {
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error(
			"DATABASE_URL is not set. Pass an env file: `dotenv -e .env.production -- …`",
		);
	}

	let target = "unparseable DATABASE_URL";

	try {
		const parsed = new URL(url);
		const database = parsed.pathname.replace(/^\//, "") || "(default)";

		target = `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}/${database}`;
	} catch {
		// Keep the fallback: a URL this script cannot parse is still a URL Prisma
		// might accept, and refusing to run over it would be unhelpful.
	}

	console.info(`\n${action} → ${target}`);
}
