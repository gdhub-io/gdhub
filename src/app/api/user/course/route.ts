import { randomUUID } from "node:crypto";
import { CourseStatus, Language } from "@gdhub-io/gdhub-prisma";
import slugify from "slugify";
import { z } from "zod";
import { SpaceRole } from "@/config/permissions/roles";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { userSpacesCacheKey } from "@/repositories/user/spaces";
import { deleteSpaceMembership, joinSpace } from "@/services/access/membership";
import { cacheDelete } from "@/services/cache";
import { prisma } from "@/services/prisma";

const CreateCourseSchema = z.object({
	name: z.string(),
	slug: z.string().optional(),
	shortLine: z.string().optional(),
	directionId: z.string(),
	language: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
	authorRate: z.number().min(0),
	agreedToTerms: z.boolean(),
});

const DeleteCourseQuerySchema = z.object({
	id: z.string(),
});

type CreateCourseBody = z.infer<typeof CreateCourseSchema>;
type DeleteCourseQuery = z.infer<typeof DeleteCourseQuerySchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateCourseSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as CreateCourseBody;

		if (!data.agreedToTerms) {
			return apiError.badRequest(
				"Course agreement must be accepted before creating a course",
			);
		}

		const slug =
			(data.slug && slugify(data.slug, { lower: true, strict: true })) ||
			`${slugify(data.name, { lower: true, strict: true })}-${randomUUID().slice(-6)}`;

		const course = await prisma.course.create({
			data: {
				name: data.name.trim(),
				slug,
				shortLine: data.shortLine?.trim() || null,
				directionId: data.directionId,
				language: (data.language as Language) ?? Language.en,
				status: CourseStatus.Draft,
				createdById: currentUser.id as string,
			},
		});

		await joinSpace({
			type: "course",
			spaceId: course.id,
			userId: currentUser.id as string,
			role: SpaceRole.Owner,
		});

		// The switcher lists this now, and a cache that says otherwise for the
		// next minute reads as the space not having been created.
		await cacheDelete(userSpacesCacheKey(currentUser.id));

		// TODO(prisma): persist the author rate once the CourseTeacher model is
		// added to the @gdhub-io/gdhub-prisma package (see proposal at the
		// bottom of this PR description). Until then, the rate is accepted by
		// the API but not stored.
		void data.authorRate;

		return json(course);
	}),
);

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "course.lifecycle.delete", idFrom: "query.id" }),
	withValidation(DeleteCourseQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { id } = body as DeleteCourseQuery;

	await prisma.course.delete({
		where: { id },
	});

	await deleteSpaceMembership("course", id);

	return json({ success: true });
});
