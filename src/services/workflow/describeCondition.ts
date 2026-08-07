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
