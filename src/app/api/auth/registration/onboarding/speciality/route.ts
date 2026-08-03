import { SkillLevel } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	aiValidation,
	type FieldInput,
	toValidationText,
} from "@/services/ai-validation";
import { prisma } from "@/services/prisma";

const SpecialityDataSchema = z.object({
	id: z.string().optional(),
	teamInvitationId: z.string().optional(),
	name: z.string().optional(),
	specialization: z.string().optional(),
	level: z.enum(Object.values(SkillLevel) as [string, ...string[]]).optional(),
	portfolioUrl: z.string().nullable().optional(),
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

/** Map speciality form data to AI-validation fields (reused by POST and PUT). */
function buildSpecialityFields(
	data: z.infer<typeof SpecialityDataSchema>,
): FieldInput[] {
	return [
		{
			key: "name",
			label: "Speciality",
			value: toValidationText(data.name),
			kind: "speciality",
		},
		{
			key: "specialization",
			label: "Specialization",
			value: toValidationText(data.specialization),
			kind: "specialization",
		},
		{
			key: "jobs",
			label: "Experience",
			value: toValidationText(data.jobs),
			kind: "experience",
		},
		{
			key: "skills",
			label: "Skills",
			value: toValidationText(data.skills),
			kind: "skills",
		},
		{
			key: "schools",
			label: "Education",
			value: toValidationText(data.schools),
			kind: "education",
		},
	];
}

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

		const validation = await aiValidation.validate(buildSpecialityFields(data));
		if (!validation.ok) {
			return json(
				{ error: "Validation failed", statusCode: 400, validation },
				{ status: 400 },
			);
		}

		const speciality = await prisma.speciality.create({
			data: {
				...data,
				userId: currentUser.id,
			} as any,
			include: { direction: true },
		});

		return json({ ...speciality, validation });
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateSpecialitySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id, data } = body as UpdateSpecialityBody;
		const { workDirectionId, tools, ...otherData } = data;

		const validation = await aiValidation.validate(buildSpecialityFields(data));
		if (!validation.ok) {
			return json(
				{ error: "Validation failed", statusCode: 400, validation },
				{ status: 400 },
			);
		}

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

		return json({ ok: true, validation });
	}),
);
