import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import slugify from "slugify";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const CreateBlogPostSchema = z.object({
	title: z.string().min(1),
	content: z.any().optional(),
	slug: z.string().optional(),
	authors: z.array(z.object({ id: z.string() })).optional(),
});

type CreateBlogPostBody = z.infer<typeof CreateBlogPostSchema>;

export const POST = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(CreateBlogPostSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { title, content, slug, authors } = body as CreateBlogPostBody;

		const coverImage = (content as any)?.blocks?.find(
			(block: any) => block.type === "image",
		)?.data?.file?.url as string;

		const post = await prisma.blogPost.create({
			data: {
				title,
				content: content || {},
				image: coverImage || undefined,
				slug: slug || slugify(title, { lower: true, strict: true }),
				authors: {
					connect: authors?.map((author) => ({ id: author.id })) || [
						{ id: currentUser.id },
					],
				},
			},
		});

		return json({ id: post.id });
	}),
);
