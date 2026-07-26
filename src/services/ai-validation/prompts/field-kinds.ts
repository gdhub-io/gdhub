/**
 * Per-field-kind configuration for relevance checks.
 *
 * Edit the `expectation` strings freely to tune what counts as a valid value —
 * they are sent verbatim to the model, so no other code changes are needed.
 * `defaultSeverity` decides whether an irrelevant/gibberish value blocks the
 * save (`error`) or is only a soft warning (`warning`).
 */

import type { FieldKind, FieldSeverity } from "../types";

export type FieldKindConfig = {
	defaultSeverity: FieldSeverity;
	/** Plain-language description of what a VALID value looks like. */
	expectation: string;
};

export const FIELD_KINDS: Record<FieldKind, FieldKindConfig> = {
	person_name: {
		defaultSeverity: "warning",
		expectation:
			"A real personal first and/or last name in any language or script. " +
			"It is a name — not a sentence, a job title, a slogan, or random " +
			"characters. Nicknames and transliterations are acceptable.",
	},
	speciality: {
		defaultSeverity: "error",
		expectation:
			'A game-development job title or professional speciality (e.g. "Game ' +
			'Designer", "3D Artist", "Unity Developer", "Narrative Writer", ' +
			'"Composer"). Not a hobby, a random phrase, or filler text.',
	},
	specialization: {
		defaultSeverity: "error",
		expectation:
			"A meaningful description of what the person specialises in within " +
			"their profession (tools, domains, focus areas). Not filler, not " +
			"unrelated text, not a single random word.",
	},
	experience: {
		defaultSeverity: "error",
		expectation:
			"A meaningful description of professional experience, projects, or " +
			"roles the person has held. Not filler or unrelated text.",
	},
	skills: {
		defaultSeverity: "warning",
		expectation:
			"A list or description of professional skills relevant to game " +
			"development or the person's profession.",
	},
	education: {
		defaultSeverity: "warning",
		expectation:
			"Information about education: schools, universities, courses, or " +
			"degrees. Not filler or unrelated text.",
	},
	motivation: {
		defaultSeverity: "warning",
		expectation:
			"A sincere description of the person's motivation or goals related to " +
			"game development or professional growth. Some free expression is fine " +
			"as long as it stays on-topic and meaningful.",
	},
	freeform: {
		defaultSeverity: "warning",
		expectation:
			"Meaningful, coherent text that is not gibberish, keyboard-mashing, or " +
			"obvious filler.",
	},
};
