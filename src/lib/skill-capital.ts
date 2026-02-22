import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";

export const SC_RI_WEIGHT = 100;

const ENTRY_STAGE_COEFS: Record<string, number> = {
	ideation: 1.5,
	prototype: 1.2,
	verticalSlice: 1.1,
	mvp: 1.0,
	release: 0.8,
};

const OUTCOME_COEFS: Record<prismaClient.ProjectStatus, number> = {
	[prismaClient.ProjectStatus.Registered]: 0,
	[prismaClient.ProjectStatus.Approved]: 1.0,
	[prismaClient.ProjectStatus.Rejected]: 0,
	[prismaClient.ProjectStatus.Dormant]: 0.8,
	[prismaClient.ProjectStatus.Archived]: 0.6,
	[prismaClient.ProjectStatus.Released]: 1.3,
	[prismaClient.ProjectStatus.KilledWithDignity]: 1.0,
};

type WorkflowStep = { name?: string | null; order?: number | null };

const normalizeStageKey = (name?: string | null) => {
	if (!name) return null;
	const normalized = name.toLowerCase();

	if (normalized.includes("idea") || normalized.includes("concept"))
		return "ideation";
	if (normalized.includes("prototype")) return "prototype";
	if (normalized.includes("vertical") || normalized.includes("demo"))
		return "verticalSlice";
	if (normalized.includes("mvp")) return "mvp";
	if (normalized.includes("release")) return "release";

	return null;
};

const resolveStageKeyByOrder = (
	order?: number | null,
	totalSteps?: number | null,
) => {
	if (!order || !totalSteps) return "mvp";
	const ratio = order / totalSteps;

	if (ratio <= 0.3) return "ideation";
	if (ratio <= 0.5) return "prototype";
	if (ratio <= 0.7) return "verticalSlice";
	if (ratio <= 0.85) return "mvp";
	return "release";
};

export const getEntryStageCoef = (
	step?: WorkflowStep | null,
	totalSteps?: number | null,
) => {
	const stageKey =
		normalizeStageKey(step?.name) ??
		resolveStageKeyByOrder(step?.order, totalSteps);

	return ENTRY_STAGE_COEFS[stageKey] ?? ENTRY_STAGE_COEFS.mvp;
};

export const getOutcomeCoef = (status: prismaClient.ProjectStatus) =>
	OUTCOME_COEFS[status] ?? 1;

export const getActiveDays = ({
	startedAt,
	finishedAt,
	status,
	dormantAt,
	statusChangedAt,
	archivedAt,
	killedWithDignityAt,
	projectFinishedAt,
}: {
	startedAt: Date;
	finishedAt?: Date | null;
	status: prismaClient.ProjectStatus;
	dormantAt?: Date | null;
	statusChangedAt?: Date | null;
	archivedAt?: Date | null;
	killedWithDignityAt?: Date | null;
	projectFinishedAt?: Date | null;
}) => {
	if (
		status === prismaClient.ProjectStatus.Registered ||
		status === prismaClient.ProjectStatus.Rejected
	) {
		return 0;
	}

	const start = dayjs(startedAt);
	const end = dayjs(finishedAt ?? new Date());
	let activeEnd = end;

	if (status !== prismaClient.ProjectStatus.Approved) {
		const frozenAt =
			dormantAt ??
			statusChangedAt ??
			archivedAt ??
			killedWithDignityAt ??
			projectFinishedAt ??
			null;

		if (frozenAt) {
			const frozenMoment = dayjs(frozenAt);
			activeEnd = frozenMoment.isBefore(end) ? frozenMoment : end;
		}
	}

	const diff = activeEnd.diff(start, "day");
	return diff > 0 ? diff : 0;
};
