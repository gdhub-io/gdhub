/**
 * Shared types for the AI validation service.
 *
 * This file is intentionally framework/provider agnostic and imports nothing
 * server-only, so client components can safely import the types to render
 * validation feedback.
 */

/** Whether a failed check blocks saving (`error`) or is only advisory (`warning`). */
export type FieldSeverity = "error" | "warning";

/**
 * The kind of content a field is expected to contain. Each kind maps to an
 * editable descriptor in `prompts/field-kinds.ts`. Add a new kind here plus a
 * matching entry there to reuse the validator in other forms.
 */
export type FieldKind =
	| "person_name"
	| "speciality"
	| "specialization"
	| "experience"
	| "skills"
	| "education"
	| "motivation"
	| "freeform";

/** Why a field failed validation. */
export type FieldIssueReason = "moderation" | "irrelevant" | "gibberish";

/** A single field to validate. */
export type FieldInput = {
	/** Stable key echoed back in the verdict — usually the form field name. */
	key: string;
	/** Human-readable label, used only to give the model context in the prompt. */
	label?: string;
	/** The user-entered value to validate. */
	value: string;
	/** What kind of content this field should contain. */
	kind: FieldKind;
	/**
	 * Override the blocking behaviour of a relevance failure. Defaults to the
	 * field-kind's `defaultSeverity`. Moderation failures are always `error`.
	 */
	severity?: FieldSeverity;
	/** Skip the relevance check for this field (it is still moderated). */
	skipRelevance?: boolean;
};

/** A problem found with one field. */
export type FieldIssue = {
	key: string;
	severity: FieldSeverity;
	reason: FieldIssueReason;
	/** i18n key the client can translate; falls back to `message`. */
	messageKey: string;
	/** English fallback / debugging message. */
	message: string;
	/** Moderation categories that fired (only when `reason === "moderation"`). */
	categories?: string[];
};

/** Aggregated validation outcome for a set of fields. */
export type ValidationResult = {
	/** `true` when there are no `error`-severity issues — saving may proceed. */
	ok: boolean;
	issues: FieldIssue[];
	errors: FieldIssue[];
	warnings: FieldIssue[];
};

export type ValidateOptions = {
	/** ISO locale, forwarded to the model for context. Defaults to `en`. */
	locale?: string;
};
