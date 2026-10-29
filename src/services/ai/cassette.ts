import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";

/**
 * Recorded model answers for the e2e stand (`LLM_CASSETTES`), so a run is fast
 * and judges our code on the same answer every time; the real model is tried
 * in the AI curator lab instead.
 *  - `auto`: answer from a recording, record what is missing;
 *  - `replay`: recordings only, a missing one fails the call;
 *  - `record`: always ask the model and write over the recording.
 * Only on the stand: the app the team uses must never answer from a
 * recording, so it also takes the stand's own E2E_TEST_AUTH, and never
 * production.
 */
type Mode = "auto" | "replay" | "record";

const DIR = path.join(process.cwd(), "tests/e2e/cassettes");

export const cassetteMode = (): Mode | null => {
	if (process.env.NODE_ENV === "production") return null;
	if (process.env.E2E_TEST_AUTH !== "1") return null;
	const mode = process.env.LLM_CASSETTES;
	return mode === "auto" || mode === "replay" || mode === "record"
		? mode
		: null;
};

const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";

/**
 * What a prompt says that changes from run to run and must not change its key:
 * ids, the stand's run token, dates and times. Days of the checkpoint stay — the
 * stand moves time by them, so they are the same on every run.
 */
export const normalizeForKey = (text: string) =>
	text
		.replace(
			/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?/g,
			"<time>",
		)
		.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<date>")
		.replace(new RegExp(`\\b\\d{1,2} ${MONTH}( \\d{4})?\\b`, "g"), "<date>")
		.replace(new RegExp(`\\b${MONTH} \\d{1,2}(, \\d{4})?\\b`, "g"), "<date>")
		.replace(/\b\d{1,2}:\d{2}\b/g, "<clock>")
		.replace(/\bc[a-z0-9]{24}\b/g, "<id>")
		.replace(
			/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g,
			"<uuid>",
		)
		.replace(/-[0-9a-z]{8,9}(?=[@:])/g, "-<run>")
		.replace(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-\d+(?=[/?#"\s]|$)/g, "$1-<n>");

/** Bytes hash to their digest, so an image in a prompt keys by its content. */
const stableJson = (value: unknown) =>
	JSON.stringify(value, (_key, item) =>
		item instanceof Uint8Array
			? `bytes:${createHash("sha256").update(item).digest("hex")}`
			: item instanceof URL
				? item.toString()
				: item,
	);

// Bytes in an answer — an image read as evidence — survive JSON as base64.
const writeBytes = (_key: string, item: unknown) =>
	item instanceof Uint8Array
		? { $bytes: Buffer.from(item).toString("base64") }
		: item;
const readBytes = (_key: string, item: unknown) =>
	item && typeof item === "object" && "$bytes" in item
		? new Uint8Array(Buffer.from(String(item.$bytes), "base64"))
		: item;

// Two identical calls at once (the webhook and the return both starting day 1)
// share one answer; each recording its own, the second would overwrite the first.
const inFlight = new Map<string, Promise<unknown>>();

/** Runs `call`, or answers it from the recording keyed by `material`. */
export const withCassette = async <T>(
	name: string,
	material: unknown,
	call: () => Promise<T>,
	revive: (recorded: T) => T = (recorded) => recorded,
): Promise<T> => {
	const mode = cassetteMode();
	if (!mode) return call();

	const prompt = normalizeForKey(stableJson(material));
	const key = createHash("sha256").update(prompt).digest("hex").slice(0, 16);
	const file = path.join(DIR, `${name}-${key}.json`);

	if (mode !== "record" && existsSync(file)) {
		// Marked as used, so `cassettes:prune` keeps it after a full run.
		const now = new Date();
		utimesSync(file, now, now);
		return revive(
			JSON.parse(readFileSync(file, "utf8"), readBytes).answer as T,
		);
	}
	if (mode === "replay") {
		throw new Error(
			`No LLM cassette ${path.basename(file)}; record it with LLM_CASSETTES=auto`,
		);
	}

	const pending = inFlight.get(file);
	if (pending) return pending as Promise<T>;
	const recording = call();
	inFlight.set(file, recording);
	const answer = await recording.finally(() => inFlight.delete(file));
	mkdirSync(DIR, { recursive: true });
	writeFileSync(
		file,
		`${JSON.stringify({ name, prompt, answer }, writeBytes, "\t")}\n`,
	);
	console.info(`[cassette] recorded ${path.basename(file)}`);
	return answer;
};
