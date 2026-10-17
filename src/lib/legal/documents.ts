import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGAL_ENTITIES, type LegalEntity } from "@/config/legal/entities";
import {
	LEGAL_DOCUMENTS,
	type LegalCode,
	type LegalVersion,
} from "@/config/legal/registry";

export type LegalParams = Record<string, string | number>;

/**
 * Fills `{{entity.*}}` and `{{params.*}}`. An unknown placeholder throws: a
 * text with a hole in it must never be shown, let alone accepted.
 */
export function renderLegalText(
	raw: string,
	entity: LegalEntity,
	params: LegalParams = {},
): string {
	return raw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
		const [scope, name] = key.split(".");
		const value =
			scope === "entity"
				? entity[name as keyof LegalEntity]
				: scope === "params"
					? params[name]
					: undefined;
		if (value === undefined) {
			throw new Error(`Legal text has an unknown placeholder {{${key}}}`);
		}
		return String(value);
	});
}

export const legalChecksum = (text: string) =>
	createHash("sha256").update(text, "utf8").digest("hex");

export function readLegalFile(code: LegalCode, version: number): string {
	const { slug } = LEGAL_DOCUMENTS[code];
	return readFileSync(
		join(process.cwd(), "docs", "legal", slug, `v${version}.md`),
		"utf8",
	);
}

/** The text of a version as it is shown, with the checksum taken over exactly that. */
export function loadLegalText(
	code: LegalCode,
	version: LegalVersion,
	params?: LegalParams,
): { text: string; checksum: string } {
	const text = renderLegalText(
		readLegalFile(code, version.version),
		LEGAL_ENTITIES[version.entity],
		params,
	);
	return { text, checksum: legalChecksum(text) };
}
