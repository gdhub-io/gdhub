import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const SpecialityDataSchema = z.object({
	id: z.string().optional(),
	teamInvitationId: z.string().optional(),
	name: z.string().optional(),
	specialization: z.string().optional(),
	level: z
		.enum(Object.values(prismaClient.SkillLevel) as [string, ...string[]])
		.optional(),
	portfolioUrl: z.string().optional(),
	workDirectionId: z.string().optional(),
	userId: z.string().optional(),
	skills: z.any().optional(),
	tools: z.any().optional(),
	jobs: z.any().optional(),
	schools: z.any().optional(),
});

const CreateSpecialitySchema = z.object({
	data: SpecialityDataSchema,
});

const UpdateSpecialitySchema = z.object({
	id: z.string(),
	data: SpecialityDataSchema,
});

type CreateSpecialityBody = z.infer<typeof CreateSpecialitySchema>;
type UpdateSpecialityBody = z.infer<typeof UpdateSpecialitySchema>;

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const speciality = await prisma.speciality.findFirst({
		where: { userId: currentUser.id },
		include: { direction: true },
	});

	return json(speciality);
});

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateSpecialitySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { data } = body as CreateSpecialityBody;

		const speciality = await prisma.speciality.create({
			data: {
				...data,
				userId: currentUser.id,
			} as any,
			include: { direction: true },
		});

		await prisma.user.update({
			where: { id: currentUser.id },
			data: { roles: { push: "Member" } },
		});

		return json(speciality);
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateSpecialitySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const {
			id,
			data: { workDirectionId, tools, ...otherData },
		} = body as UpdateSpecialityBody;

		await prisma.speciality.update({
			where: { id, userId: currentUser.id },
			data: {
				...otherData,
				direction: workDirectionId
					? { connect: { id: workDirectionId } }
					: undefined,
			} as any,
			include: { direction: true },
		});

		return json(undefined);
	}),
);
