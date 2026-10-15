import { Prisma } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { WorkflowStepsTemplateSchema } from "@/schemas/workflow";
import { prisma } from "@/services/prisma";
import { applyResetPlan } from "@/services/workflow/applyResetPlan";
import { matchKey } from "@/services/workflow/matchKey";
import { planReset } from "@/services/workflow/planReset";

/**
 * Putting a project on a workflow stage from outside the workflow page: when it
 * is created, and when a checkpoint is drafted for it.
 *
 * A checkpoint is never bought on the first stage (Introduction) — it has no
 * work to measure — so both paths land a project on a later one, with every
 * stage before it marked finished.
 */

export const DEFAULT_WORKFLOW_SCHEMA = "default";
export const DEFAULT_PROJECT_STAGE = "Ideation";

/** Stages a new project cannot be placed on: the entry one and the two after release. */
const UNSELECTABLE_STAGES = ["Introduction", "Support", "Project Completion"];

/** The extended client's own transaction type, as the admin workflow route types it. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type StageStep = {
	id: string;
	name: string;
	plannedAt: Date | null;
};

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
 * Makes `steps[targetIndex]` current. Earlier stages are finished now unless
 * they already were; the target is reopened and gets a planned date, as a
 * forward move on the workflow page does.
 */
const placeOnStep = async (
	tx: Tx,
	workflowId: string,
	steps: StageStep[],
	targetIndex: number,
	now: Date,
): Promise<StageRef> => {
	const target = steps[targetIndex];
	const earlierIds = steps.slice(0, targetIndex).map((step) => step.id);

	if (earlierIds.length) {
		await tx.projectWorkflowStep.updateMany({
			where: { id: { in: earlierIds }, finishedAt: null },
			data: { finishedAt: now },
		});
	}

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

	return placeOnStep(
		tx,
		workflow.id,
		stepIds.map((id, index) => ({
			id,
			name: template.steps[index].name,
			plannedAt: null,
		})),
		targetIndex,
		now,
	);
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

	return placeOnStep(
		tx,
		workflow.id,
		workflow.steps,
		stageIndex(workflow.steps, stageName),
		now,
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
		return placeOnStep(
			tx,
			workflow.id,
			steps,
			Math.min(1, steps.length - 1),
			now,
		);
	});
