import { Prisma } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { matchKey } from "@/lib/workflow/matchKey";
import { WorkflowStepsTemplateSchema } from "@/schemas/workflow";
import { prisma } from "@/services/prisma";
import { applyResetPlan } from "@/services/workflow/applyResetPlan";
import { planReset } from "@/services/workflow/planReset";

/**
 * Putting a project on a workflow stage from outside the workflow page: when it
 * is created, and when a checkpoint is drafted for it.
 *
 * A checkpoint is never bought on the first stage (Introduction) — it has no
 * work to measure — so both paths land a project on a later one, with every
 * stage before it marked finished.
 */

const DEFAULT_WORKFLOW_SCHEMA = "default";
export const DEFAULT_PROJECT_STAGE = "Ideation";

/** Stages a new project cannot be placed on: the entry one and the two after release. */
export const UNSELECTABLE_STAGES = [
	"Introduction",
	"Support",
	"Project Completion",
];

/** The extended client's own transaction type, as the admin workflow route types it. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type StageRef = { id: string; name: string };

const readDefaultTemplate = async (tx: Tx) => {
	const template = await tx.workflowSchema.findUnique({
		where: { name: DEFAULT_WORKFLOW_SCHEMA },
		select: { id: true, title: true, description: true, steps: true },
	});
	if (!template) throw new Error("The default workflow template is missing");

	return {
		...template,
		steps: WorkflowStepsTemplateSchema.parse(template.steps),
	};
};

// Only the names: a task condition the app no longer knows must not take the
// stage list down with it (the strict parse is for building a workflow).
const StageNamesSchema = z.array(z.object({ name: z.string() }).passthrough());

/** The stage names the New project form offers, in template order. */
export const selectableStageNames = async (tx: Tx = prisma) => {
	const unselectable = new Set(UNSELECTABLE_STAGES.map(matchKey));
	const template = await tx.workflowSchema.findUnique({
		where: { name: DEFAULT_WORKFLOW_SCHEMA },
		select: { steps: true },
	});
	if (!template) throw new Error("The default workflow template is missing");

	return StageNamesSchema.parse(template.steps)
		.map((step) => step.name)
		.filter((name) => !unselectable.has(matchKey(name)));
};

/**
 * Makes `toStepId` the project's current stage and keeps every stage's dates true
 * to it (GDHUB-76, docs/project/team-and-stage-flow.d2):
 *  - stages before it that never finished are finished now, with no start
 *    invented for them; the stage being left forward finished now;
 *  - the new stage is reopened and starts now unless it already has a start;
 *  - going back, the stages it leaves behind lose both dates. Stages it never
 *    reached keep the dates their author planned.
 * `from` is the stage it was on; one no longer among the steps counts as the last.
 */
export const setCurrentStep = async (
	tx: Tx,
	workflowId: string,
	toStepId: string,
	{ from, now = new Date() }: { from?: string | null; now?: Date } = {},
): Promise<StageRef> => {
	const workflow = await tx.projectWorkflow.findUnique({
		where: { id: workflowId },
		select: {
			currentStepId: true,
			steps: {
				select: { id: true, name: true, plannedAt: true },
				orderBy: { order: "asc" },
			},
		},
	});
	if (!workflow) throw new Error(`No workflow ${workflowId}`);
	const { steps } = workflow;
	const to = steps.findIndex((step) => step.id === toStepId);
	if (to < 0)
		throw new Error(`Step ${toStepId} is not on workflow ${workflowId}`);

	const fromId = from === undefined ? workflow.currentStepId : from;
	const found = steps.findIndex((step) => step.id === fromId);
	const was = fromId && found < 0 ? steps.length - 1 : found;
	const ids = (a: number, b: number) =>
		steps.slice(a, b).map((step) => step.id);

	if (to > 0) {
		await tx.projectWorkflowStep.updateMany({
			where: { id: { in: ids(0, to) }, finishedAt: null },
			data: { finishedAt: now },
		});
	}
	if (was >= 0 && was < to) {
		await tx.projectWorkflowStep.update({
			where: { id: steps[was].id },
			data: { finishedAt: now },
		});
	}
	if (was > to) {
		await tx.projectWorkflowStep.updateMany({
			where: { id: { in: ids(to + 1, was + 1) } },
			data: { finishedAt: null, plannedAt: null },
		});
	}

	const target = steps[to];
	await tx.projectWorkflowStep.update({
		where: { id: target.id },
		data: {
			finishedAt: null,
			...(target.plannedAt ? null : { plannedAt: now }),
		},
	});
	await tx.projectWorkflow.update({
		where: { id: workflowId },
		data: { currentStepId: target.id },
	});

	return { id: target.id, name: target.name };
};

const stageIndex = (steps: { name: string }[], stageName: string) => {
	const index = steps.findIndex(
		(step) => matchKey(step.name) === matchKey(stageName),
	);
	if (index < 0) throw new Error(`Unknown workflow stage: ${stageName}`);
	if (index === 0)
		throw new Error("A project cannot be placed on the first stage");

	return index;
};

/**
 * Instantiates the default template for a project that has no workflow, through
 * the same plan the admin reset writes, and places it on `stageName`.
 */
export const createProjectWorkflow = async (
	tx: Tx,
	projectId: string,
	stageName: string = DEFAULT_PROJECT_STAGE,
	now = new Date(),
): Promise<StageRef> => {
	const template = await readDefaultTemplate(tx);
	const targetIndex = stageIndex(template.steps, stageName);

	const workflow = await tx.projectWorkflow.create({
		data: {
			projectId,
			workflowSchemaId: template.id,
			title: template.title,
			description: template.description,
		},
		select: { id: true },
	});

	const plan = planReset([], template.steps, "full");
	const stepIds = await applyResetPlan(tx, workflow.id, plan, Prisma.DbNull);

	return setCurrentStep(tx, workflow.id, stepIds[targetIndex], { now });
};

const readWorkflow = (tx: Tx, projectId: string) =>
	tx.projectWorkflow.findUnique({
		where: { projectId },
		select: {
			id: true,
			currentStepId: true,
			steps: {
				select: { id: true, name: true, plannedAt: true },
				orderBy: { order: "asc" },
			},
		},
	});

/**
 * Puts a freshly created project on the stage its author chose. The project
 * extension has already copied the default template onto it, on the first stage.
 */
export const placeProjectOnStage = async (
	tx: Tx,
	projectId: string,
	stageName: string = DEFAULT_PROJECT_STAGE,
	now = new Date(),
): Promise<StageRef> => {
	const workflow = await readWorkflow(tx, projectId);
	if (!workflow) return createProjectWorkflow(tx, projectId, stageName, now);

	return setCurrentStep(
		tx,
		workflow.id,
		workflow.steps[stageIndex(workflow.steps, stageName)].id,
		{ now },
	);
};

/**
 * The stage a checkpoint drafted now belongs to, moving the project off the
 * first stage when it is still there. A project with no workflow gets the
 * default one on Ideation; one whose workflow has no steps gets null.
 */
export const ensureCheckpointStage = (
	projectId: string,
	now = new Date(),
): Promise<StageRef | null> =>
	prisma.$transaction(async (tx) => {
		const workflow = await readWorkflow(tx, projectId);
		if (!workflow) return createProjectWorkflow(tx, projectId, undefined, now);

		const { steps } = workflow;
		if (!steps.length) return null;

		const currentIndex = steps.findIndex(
			(step) => step.id === workflow.currentStepId,
		);
		if (currentIndex > 0) {
			const current = steps[currentIndex];
			return { id: current.id, name: current.name };
		}

		// On the first stage, or on none at all: the next one is where work starts.
		return setCurrentStep(
			tx,
			workflow.id,
			steps[Math.min(1, steps.length - 1)].id,
			{ now },
		);
	});
