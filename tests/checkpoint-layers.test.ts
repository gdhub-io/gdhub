import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { describe, expect, it } from "vitest";

/**
 * A checkpoint repository reads and writes rows. Notifying, charging, calling
 * the AI or a video provider is a flow, in `services/checkpoints/flows`, which
 * may use the repositories but never the other way round. A type import is
 * free: it leaves nothing behind at runtime.
 */

const ROOT = path.resolve(__dirname, "..");
const ALLOWED = new Set(["@/services/prisma"]);
const RUNTIME_IMPORT =
	/(?:^|\n)\s*import\s+(?!type\s)[^;]*?from\s+"(@\/services\/[^"]+)"|import\(\s*"(@\/services\/[^"]+)"\s*\)/g;

describe("checkpoint repositories", () => {
	it("use no service but the database at runtime", async () => {
		const files = await glob("src/repositories/checkpoints/**/*.ts", {
			cwd: ROOT,
		});
		const offenders = files.flatMap((file) => {
			const source = readFileSync(path.join(ROOT, file), "utf8");
			return [...source.matchAll(RUNTIME_IMPORT)]
				.map((match) => match[1] ?? match[2])
				.filter((module) => !ALLOWED.has(module))
				.map((module) => `${file} → ${module}`);
		});

		expect(files.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});
});
