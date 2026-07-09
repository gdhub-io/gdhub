import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";

/**
 * Workflow task completion is evaluated by the platform against project data,
 * not toggled by users. A task carries a *condition* describing what data must
 * exist for it to count as done.
 *
 * To stay safe and predictable, conditions are built from a whitelist of
 * project-scoped sources (models) with a fixed set of filter fields — not an
 * arbitrary Prisma `where`.
 */

/** Project scalar fields that a "fields filled" condition may require. */
export const PROJECT_CONDITION_FIELDS = [
	"name",
	"description",
	"genre",
	"platform",
	"setting",
	"visualStyle",
	"audition",
	"conceptLink",
	"gddLink",
	"pitchdeckLink",
	"videoLink",
	"coverImage",
	"coreMechanics",
] as const;

export type ProjectConditionField = (typeof PROJECT_CONDITION_FIELDS)[number];

const minCount = z.coerce.number().int().min(1).default(1);

/**
 * Whether a count is taken across the whole project or only within the current
 * workflow step. Step scope uses the model's step binding where it exists
 * (`TeamVacancy.promiseStepId`, `TeamMember.enteredProjectStepId`); for devlog
 * posts it falls back to "published since the step started" until
 * `ProjectReport.stepId` exists (see docs/workflow-task-conditions-external-package.md).
 */
const conditionScope = z.enum(["project", "step"]).optional();

/** Done when every listed project field is filled (non-empty). */
const ProjectFieldsCondition = z.object({
	source: z.literal("project_fields"),
	fields: z.array(z.enum(PROJECT_CONDITION_FIELDS)).min(1),
});

/** Done when the project (or current step) has at least `min` devlog posts. */
const DevlogPostsCondition = z.object({
	source: z.literal("devlog_posts"),
	min: minCount,
	scope: conditionScope,
});

/** Done when the team has at least `min` vacancies (optionally filtered). */
const VacanciesCondition = z.object({
	source: z.literal("vacancies"),
	min: minCount,
	scope: conditionScope,
	status: z.nativeEnum(prismaClient.TeamVacancyStatus).optional(),
	directionId: z.string().optional(),
});

/** Done when the team has at least `min` members (optionally by status). */
const TeamMembersCondition = z.object({
	source: z.literal("team_members"),
	min: minCount,
	scope: conditionScope,
	status: z.nativeEnum(prismaClient.TeamMemberStatus).optional(),
});

/** Done when the team has at least `min` investors. */
const InvestorsCondition = z.object({
	source: z.literal("investors"),
	min: minCount,
});

/** Done when the team has at least `min` documents (optionally by type). */
const DocumentsCondition = z.object({
	source: z.literal("documents"),
	min: minCount,
	type: z.nativeEnum(prismaClient.TeamDocumentType).optional(),
});

/** Done when the project has at least `min` advice requests (optionally by status). */
const AdviceRequestsCondition = z.object({
	source: z.literal("advice_requests"),
	min: minCount,
	status: z.nativeEnum(prismaClient.AdviceRequestStatus).optional(),
});

/** Done when the project has at least `min` estimations. */
const EstimationsCondition = z.object({
	source: z.literal("estimations"),
	min: minCount,
});

/** Done when the project equity has at least `min` allocations. */
const EquityAllocationsCondition = z.object({
	source: z.literal("equity_allocations"),
	min: minCount,
});

/** Done when the project has collected at least `min` applause activities. */
const ApplauseCondition = z.object({
	source: z.literal("applause"),
	min: minCount,
	type: z.nativeEnum(prismaClient.ApplauseActivityType).optional(),
});

/** Done when the project has at least `min` links (Project.links array). */
const LinksCondition = z.object({
	source: z.literal("links"),
	min: minCount,
});

export const WorkflowTaskConditionSchema = z.discriminatedUnion("source", [
	ProjectFieldsCondition,
	DevlogPostsCondition,
	VacanciesCondition,
	TeamMembersCondition,
	InvestorsCondition,
	DocumentsCondition,
	AdviceRequestsCondition,
	EstimationsCondition,
	EquityAllocationsCondition,
	ApplauseCondition,
	LinksCondition,
]);

export type WorkflowTaskCondition = z.infer<typeof WorkflowTaskConditionSchema>;
export type WorkflowTaskConditionSource = WorkflowTaskCondition["source"];

/**
 * UI metadata for the admin condition builder: what each source is called and
 * which whitelisted filters it exposes. Keeps the editor in sync with the
 * evaluator without hardcoding form logic per source.
 */
export type ConditionFilterMeta = {
	key: string;
	label: string;
	options: { value: string; label: string }[];
};

export type ConditionSourceMeta = {
	source: WorkflowTaskConditionSource;
	label: string;
	/** Whether the source is a count-based check with a `min` threshold. */
	hasMin: boolean;
	filters: ConditionFilterMeta[];
};

const enumOptions = (e: Record<string, string>) =>
	Object.values(e).map((value) => ({ value, label: value }));

export const CONDITION_SOURCE_META: ConditionSourceMeta[] = [
	{
		source: "project_fields",
		label: "Project fields filled",
		hasMin: false,
		filters: [
			{
				key: "fields",
				label: "Fields",
				options: PROJECT_CONDITION_FIELDS.map((value) => ({
					value,
					label: value,
				})),
			},
		],
	},
	{ source: "devlog_posts", label: "Devlog posts", hasMin: true, filters: [] },
	{
		source: "vacancies",
		label: "Vacancies",
		hasMin: true,
		filters: [
			{
				key: "status",
				label: "Status",
				options: enumOptions(prismaClient.TeamVacancyStatus),
			},
		],
	},
	{
		source: "team_members",
		label: "Team members",
		hasMin: true,
		filters: [
			{
				key: "status",
				label: "Status",
				options: enumOptions(prismaClient.TeamMemberStatus),
			},
		],
	},
	{ source: "investors", label: "Investors", hasMin: true, filters: [] },
	{
		source: "documents",
		label: "Documents",
		hasMin: true,
		filters: [
			{
				key: "type",
				label: "Type",
				options: enumOptions(prismaClient.TeamDocumentType),
			},
		],
	},
	{
		source: "advice_requests",
		label: "Advice requests",
		hasMin: true,
		filters: [
			{
				key: "status",
				label: "Status",
				options: enumOptions(prismaClient.AdviceRequestStatus),
			},
		],
	},
	{ source: "estimations", label: "Estimations", hasMin: true, filters: [] },
	{ source: "links", label: "Project links", hasMin: true, filters: [] },
	{
		source: "equity_allocations",
		label: "Equity allocations",
		hasMin: true,
		filters: [],
	},
	{
		source: "applause",
		label: "Applause",
		hasMin: true,
		filters: [
			{
				key: "type",
				label: "Type",
				options: enumOptions(prismaClient.ApplauseActivityType),
			},
		],
	},
];
