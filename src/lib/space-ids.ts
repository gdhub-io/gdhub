import { prisma } from "@/services/prisma";

/**
 * Resolvers for routes that address a nested entity — a team member, a workflow
 * step — where the owning project has to be looked up before access can be
 * checked. Used as the functional `idFrom` of `withSpaceGuard`.
 *
 * Returning `null` makes the guard answer 404: no owning space, nothing to
 * authorise against.
 */

const fromBody = async (req: Request, key = "id"): Promise<string | null> => {
	const body = (await req
		.clone()
		.json()
		.catch(() => ({}))) as Record<string, unknown>;
	const value = body[key];

	return typeof value === "string" ? value : null;
};

/** Reads the key from the body first, then from the query string. */
const fromBodyOrQuery = async (
	req: Request,
	key: string,
): Promise<string | null> =>
	(await fromBody(req, key)) ?? new URL(req.url).searchParams.get(key);

/** `{ id }` in the body is a `TeamMember` id. */
export const projectOfTeamMember = async (
	req: Request,
): Promise<string | null> => {
	const id = await fromBody(req);
	if (!id) return null;

	const member = await prisma.teamMember.findUnique({
		where: { id },
		select: { team: { select: { project: { select: { id: true } } } } },
	});

	return member?.team?.project?.id ?? null;
};

/** `{ id }` in the body is a `ProjectWorkflowStep` id. */
export const projectOfWorkflowStep = async (
	req: Request,
): Promise<string | null> => {
	const id = await fromBody(req);
	if (!id) return null;

	const step = await prisma.projectWorkflowStep.findUnique({
		where: { id },
		select: { projectWorkflow: { select: { projectId: true } } },
	});

	return step?.projectWorkflow?.projectId ?? null;
};

/** `{ promiseId }` in the body or the query is an `EquityPromise` id. */
export const projectOfEquityPromise = async (
	req: Request,
): Promise<string | null> => {
	const promiseId = await fromBodyOrQuery(req, "promiseId");
	if (!promiseId) return null;

	const promise = await prisma.equityPromise.findUnique({
		where: { id: promiseId },
		select: {
			allocation: {
				select: { equity: { select: { projectId: true } } },
			},
		},
	});

	return promise?.allocation?.equity?.projectId ?? null;
};

/** `teamId` in the body or the query — the project the team belongs to. */
export const projectOfTeam = async (req: Request): Promise<string | null> => {
	const teamId = await fromBodyOrQuery(req, "teamId");
	if (!teamId) return null;

	const team = await prisma.team.findUnique({
		where: { id: teamId },
		select: { projectId: true },
	});

	return team?.projectId ?? null;
};

/** `artifactId` in the route params — the project the artifact belongs to. */
export const projectOfArtifact = async (
	_req: Request,
	params: Record<string, string | string[]> | undefined,
): Promise<string | null> => {
	const raw = params?.artifactId;
	const artifactId = Array.isArray(raw) ? raw[0] : raw;

	if (!artifactId) return null;

	const artifact = await prisma.projectArtifact.findUnique({
		where: { id: artifactId },
		select: { projectId: true },
	});

	return artifact?.projectId ?? null;
};

/** `id` in the route params — the project the checkpoint belongs to. */
export const projectOfCheckpoint = async (
	_req: Request,
	params: Record<string, string | string[]> | undefined,
): Promise<string | null> => {
	const raw = params?.id;
	const checkpointId = Array.isArray(raw) ? raw[0] : raw;

	if (!checkpointId) return null;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { projectId: true },
	});

	return checkpoint?.projectId ?? null;
};

/** `vacancyId` or `id` — the project the vacancy belongs to. */
export const projectOfVacancy = async (
	req: Request,
): Promise<string | null> => {
	const vacancyId =
		(await fromBodyOrQuery(req, "vacancyId")) ??
		(await fromBodyOrQuery(req, "id"));

	if (!vacancyId) return null;

	const vacancy = await prisma.teamVacancy.findUnique({
		where: { id: vacancyId },
		select: { team: { select: { projectId: true } } },
	});

	return vacancy?.team?.projectId ?? null;
};

/** `id` in the body is a `ProjectEquity` id. */
export const projectOfEquity = async (req: Request): Promise<string | null> => {
	const equityId = await fromBody(req);
	if (!equityId) return null;

	const equity = await prisma.projectEquity.findUnique({
		where: { id: equityId },
		select: { projectId: true },
	});

	return equity?.projectId ?? null;
};

/** `teamMemberId` in the body — the project that member belongs to. */
export const projectOfTeamMemberId = async (
	req: Request,
): Promise<string | null> => {
	const teamMemberId = await fromBodyOrQuery(req, "teamMemberId");
	if (!teamMemberId) return null;

	const member = await prisma.teamMember.findUnique({
		where: { id: teamMemberId },
		select: { team: { select: { projectId: true } } },
	});

	return member?.team?.projectId ?? null;
};
