/**
 * Reading an `AuditLog.changes` payload.
 *
 * Two shapes exist in the table. Rows written from `@gdhub-io/gdhub-prisma`
 * 2.0.0-beta.46 onwards carry `v: 2` and a real before/after diff; everything
 * older carries `{ where, data }` with no previous value and a `"[complex]"`
 * marker where the selector should be. The screen has to render both, so the
 * branching lives here rather than in the components.
 */

export type AuditChangeEntry = {
	field: string;
	from?: unknown;
	to?: unknown;
	/** The field changed but its value is not in the log — personal, or off the allowlist. */
	valueUnknown: boolean;
};

export type NormalizedChanges = {
	/** `null` for legacy rows, which predate the versioned payload. */
	version: number | null;
	entries: AuditChangeEntry[];
	/** Rows a bulk statement matched. */
	count?: number;
	/** The write reached further than the log records ids for. */
	truncated: boolean;
};

const EMPTY: NormalizedChanges = {
	version: null,
	entries: [],
	truncated: false,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const asStringArray = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((v): v is string => typeof v === "string")
		: [];

/** A `{ from, to }` pair from a v2 diff; `from` is absent when no snapshot was read. */
const readDiffEntry = (field: string, value: unknown): AuditChangeEntry => {
	const pair = asRecord(value);
	if (!pair) return { field, to: value, valueUnknown: false };

	return {
		field,
		...("from" in pair ? { from: pair.from } : {}),
		to: pair.to,
		valueUnknown: false,
	};
};

export const normalizeAuditChanges = (changes: unknown): NormalizedChanges => {
	const record = asRecord(changes);
	if (!record) return EMPTY;

	const version = typeof record.v === "number" ? record.v : null;

	const count = typeof record.count === "number" ? { count: record.count } : {};

	if (version === null) {
		// Legacy: only the write payload, so every field is a "to" with no "from",
		// and `where` was flattened to the string "[complex]".
		const data = asRecord(record.data) ?? {};

		return {
			version: null,
			entries: Object.entries(data).map(([field, to]) => ({
				field,
				to,
				valueUnknown: false,
			})),
			...count,
			truncated: false,
		};
	}

	const diff = asRecord(record.diff);
	const after = asRecord(record.after);
	const before = asRecord(record.before);

	// `fields` lists what the write touched; the value blocks hold what could be
	// recorded. Neither is a superset — a delete fills `before` without listing
	// names, and a personal field is named without a value — so both are walked.
	const names = new Set([
		...asStringArray(record.fields),
		...Object.keys(diff ?? after ?? before ?? {}),
	]);

	return {
		version,
		entries: [...names].map((field) => {
			if (diff && field in diff) return readDiffEntry(field, diff[field]);
			if (after && field in after)
				return { field, to: after[field], valueUnknown: false };
			if (before && field in before)
				return { field, from: before[field], valueUnknown: false };
			return { field, valueUnknown: true };
		}),
		...count,
		truncated: asRecord(record.target)?.truncated === true,
	};
};

/** A value as it goes into a diff cell. Objects are already depth-capped by the package. */
export const formatAuditValue = (value: unknown): string => {
	if (value === null) return "null";
	if (value === undefined) return "—";
	if (typeof value === "string") return value.length ? value : '""';
	if (typeof value === "boolean" || typeof value === "number")
		return String(value);
	if (Array.isArray(value)) return value.map(formatAuditValue).join(", ");
	return JSON.stringify(value);
};
