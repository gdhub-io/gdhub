import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

const SpeakerQuerySchema = z.object({
	id: z.string(),
});

type SpeakerQuery = z.infer<typeof SpeakerQuerySchema>;

const SpeakerBodySchema = z.record(z.string(), z.unknown());

type SpeakerBody = z.infer<typeof SpeakerBodySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.lectures.view" }),
	withValidation(SpeakerQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { id } = body as SpeakerQuery;
	const response = await prisma.lecturerRequest.findFirst({
		where: { id },
	});
	return json(response);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.lectures.manage" }),
)(async (req) => {
	const url = new URL(req.url);
	const id = url.searchParams.get("id");
	if (!id) return apiError.badRequest("id is required");

	const rawBody = (await req.json().catch(() => null)) as SpeakerBody | null;
	if (!rawBody) return apiError.badRequest("Invalid JSON body");

	const { id: _omit, ...data } = rawBody as Record<string, unknown>;
	const updated = await prisma.lecturerRequest.update({
		where: { id },
		data: data as never,
	});
	return json(updated);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.lectures.manage" }),
)(async (req) => {
	const url = new URL(req.url);
	const id = url.searchParams.get("id");
	if (!id) return apiError.badRequest("id is required");
	const deleted = await prisma.lecturerRequest.delete({ where: { id } });
	return json(deleted);
});
