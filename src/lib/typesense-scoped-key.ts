import { createHmac } from "node:crypto";

/**
 * Typesense's scoped search key: the parameters are signed with the parent
 * key, and the server enforces them on every search made with the result.
 * Same algorithm as typesense-js `keys().generateScopedSearchKey`.
 */
export function scopedSearchKey(
	parentKey: string,
	parameters: Record<string, unknown>,
): string {
	const json = JSON.stringify(parameters);
	const digest = createHmac("sha256", parentKey).update(json).digest("base64");
	return Buffer.from(`${digest}${parentKey.slice(0, 4)}${json}`).toString(
		"base64",
	);
}
