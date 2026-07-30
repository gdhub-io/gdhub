import { BlogPostStatus, UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UpdateBlogPostSchema = z.object({
	title: z.string().optional(),
	content: z.any().optional(),
	slug: z.string().optional(),
	authors: z.array(z.object({ id: z.string() })).optional(),
	status: z
		.enum(Object.values(BlogPostStatus) as [string, ...string[]])
		.optional(),
});

type UpdateBlogPostBody = z.infer<typeof UpdateBlogPostSchema>;

export const GET = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const post = await prisma.blogPost.findUnique({
		where: { id },
		include: {
			authors: { select: { id: true, name: true, image: true } },
		},
	});

	return json(post);
});

export const PUT = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(
	withValidation(UpdateBlogPostSchema)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id } = (await ctx.params) as { id: string };
		const { title, content, slug, status, authors } =
			body as UpdateBlogPostBody;

		const coverImage = (content as any)?.blocks?.find(
			(block: any) => block.type === "image",
		)?.data?.file?.url as string;

		const post = await prisma.blogPost.update({
			where: { id },
			data: {
				title: title || undefined,
				content: content || undefined,
				slug: slug || undefined,
				image: coverImage || undefined,
				authors: {
					connect: authors?.map((author) => ({ id: author.id })) || [],
				},
				status: (status as BlogPostStatus) || undefined,
				publishedAt: status === BlogPostStatus.Published ? new Date() : null,
			},
		});

		return json(post);
	}),
);

export const DELETE = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	await prisma.blogPost.delete({ where: { id } });

	return json({ success: true });
});
