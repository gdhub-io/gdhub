import { hasBlocks } from "@/helpers/editorjs";

/**
 * Steps and tasks are matched between a project and its template by name — the
 * template's copies carry no shared id — so every comparison in this area hangs
 * on the same question: are these two the same thing?
 *
 * One answer, in one place. A rename back to what it was, typed differently, is
 * not a change; and a drift check, a reset plan and a difference list that
 * disagreed about that would each be right about a different workflow.
 */
export const matchKey = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

/**
 * A project's step's template step (GDHUB-97): by name, as a reset matches them,
 * and by position where the template renamed its step.
 */
export const templateStepFor = <T extends { name: string }>(
	templateSteps: T[],
	step: { order: number; name: string },
): T | null =>
	(matchKey(step.name) &&
		templateSteps.find(
			(each) => matchKey(each.name) === matchKey(step.name),
		)) ||
	templateSteps[step.order] ||
	null;

/**
 * What a project's stage says and aims at (GDHUB-97): the project's own goal
 * and text where it has them, else its template step's — the one rule every
 * reader applies, the author's page, the AI curator and the admin editor alike.
 */
export const stageOf = (
	templateSteps: PrismaJson.WorkflowStep[],
	step: {
		order: number;
		name: string;
		goal?: string | null;
		content?: PrismaJson.EditorJsContent | null;
	},
) => {
	const fromTemplate = templateStepFor(templateSteps, step);
	return {
		goal: step.goal || fromTemplate?.goal || null,
		content: hasBlocks(step.content)
			? step.content
			: hasBlocks(fromTemplate?.content)
				? fromTemplate.content
				: null,
		/** The template's own, for an editor showing what the project would fall back to. */
		template: {
			goal: fromTemplate?.goal ?? null,
			content: hasBlocks(fromTemplate?.content) ? fromTemplate.content : null,
		},
	};
};
