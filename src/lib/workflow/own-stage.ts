import { hasBlocks } from "@/helpers/editorjs";
import type { WorkflowStepInput } from "@/schemas/workflow";

/**
 * A project step's own goal and text, as the editor sends them (GDHUB-97).
 * Absent leaves the stored value be — a payload that does not carry a field
 * never wipes it; null or empty clears it back to the template's.
 * `clear` is what the store writes for "no value" (Prisma's DbNull for Json).
 */
export const ownStageFields = <Clear>(
	input: WorkflowStepInput,
	clear: Clear,
) => ({
	goal: input.goal === undefined ? undefined : input.goal || null,
	content:
		input.content === undefined
			? undefined
			: hasBlocks(input.content)
				? input.content
				: clear,
});
