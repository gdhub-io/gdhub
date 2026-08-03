import { z } from "zod";
import { isSpaceType, type SpaceType } from "@/config/spaces";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { DEFAULT_SPACE_ID } from "@/services/access/types";
import { prisma } from "@/services/prisma";

const QuerySchema = z.object({
	type: z.string().refine(isSpaceType, "Unknown space type"),
	query: z.string().optional(),
});

type SpaceOption = { id: string; title: string };

const LIMIT = 20;

/**
 * Spaces with no entity behind them: one row, always the same id. `hub` is not
 * offered — it is edited by the "Hub role" control, not as a membership.
 */
const SINGLETON: Partial<Record<SpaceType, string>> = {
	admin: "Platform administration",
	dev: "Developer tools",
};

const search = async (
	type: SpaceType,
	query: string | undefined,
): Promise<SpaceOption[]> => {
	const singleton = SINGLETON[type];

	if (singleton) return [{ id: DEFAULT_SPACE_ID, title: singleton }];

	const contains = query
		? { contains: query, mode: "insensitive" as const }
		: undefined;

	if (type === "project") {
		const rows = await prisma.project.findMany({
			where: contains ? { name: contains } : undefined,
			select: { id: true, name: true },
			orderBy: { name: "asc" },
			take: LIMIT,
		});

		return rows.map((row) => ({ id: row.id, title: row.name }));
	}

	if (type === "event") {
		const rows = await prisma.event.findMany({
			where: contains ? { title: contains } : undefined,
			select: { id: true, title: true },
			orderBy: { title: "asc" },
			take: LIMIT,
		});

		return rows.map((row) => ({ id: row.id, title: row.title }));
	}

	if (type === "course") {
		const rows = await prisma.course.findMany({
			where: contains ? { name: contains } : undefined,
			select: { id: true, name: true },
			orderBy: { name: "asc" },
			take: LIMIT,
		});

		return rows.map((row) => ({ id: row.id, title: row.name }));
	}

	return [];
};

/** Spaces a membership can be added to, for the admin "Add membership" picker. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.manage" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { type, query } = body as z.infer<typeof QuerySchema>;

	return json(await search(type as SpaceType, query));
});
