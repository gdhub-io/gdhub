import { CONDITION_SOURCE_META } from "@/schemas/workflowTaskCondition";

/**
 * A condition in a few words, for the chip on a task row.
 *
 * The editor shows the full rule; a list only needs enough to tell "the
 * platform proves this" from "somebody has to confirm it", and which signal it
 * watches. Labels come from the same table the editor builds its form from, so
 * the two cannot drift apart.
 */
export function describeCondition(
	condition: PrismaJson.WorkflowTaskCondition,
): string {
	const label =
		CONDITION_SOURCE_META.find((meta) => meta.source === condition.source)
			?.label ?? condition.source;

	if (condition.source === "project_fields") {
		const count = condition.fields?.length ?? 0;
		return count === 1 ? `${label}: 1 field` : `${label}: ${count} fields`;
	}

	const min = "min" in condition ? condition.min : undefined;
	return min ? `${label} ≥ ${min}` : label;
}

/** Enum values read as prose, but an abbreviation must keep its capitals. */
const spoken = (value: string) =>
	/^[A-Z][a-z]+$/.test(value) ? value.toLowerCase() : value;

/**
 * The same rule as a full sentence, for the editor.
 *
 * The condition builder is a row of dropdowns, and a row of dropdowns is easy to
 * assemble into something you did not mean. Reading the rule back in plain words
 * is how the admin checks it before saving.
 */
export function explainCondition(
	condition: PrismaJson.WorkflowTaskCondition,
): string {
	const meta = CONDITION_SOURCE_META.find(
		(item) => item.source === condition.source,
	);

	if (condition.source === "project_fields") {
		const count = condition.fields?.length ?? 0;
		if (!count) return "Pick at least one field for this rule to work.";
		return count === 1
			? "Completes automatically once that project field is filled in."
			: `Completes automatically once all ${count} project fields are filled in.`;
	}

	const min = "min" in condition && condition.min ? condition.min : 1;
	const noun = meta?.noun[min === 1 ? 0 : 1] ?? condition.source;

	const filter =
		("status" in condition && condition.status) ||
		("type" in condition && condition.type) ||
		null;
	const subject = filter ? `${spoken(filter)} ${noun}` : noun;

	const within =
		"scope" in condition && condition.scope === "step"
			? " created during the current step"
			: "";

	return `Completes automatically once the project has at least ${min} ${subject}${within}.`;
}
