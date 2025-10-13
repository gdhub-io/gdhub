import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import slugify from "slugify";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class CreateBlogPostDto {
	@IsString()
	@IsNotEmpty()
	@IsString()
	title: string;

	@IsObject()
	@IsOptional()
	content?: JsonValue;

	@IsString()
	@IsOptional()
	slug: string;

	@IsArray()
	@IsOptional()
	authors?: { id: string }[];
}

class UpdateBlogPostDto {
	@IsString()
	@IsOptional()
	title?: string;

	@IsObject()
	@IsOptional()
	content?: JsonValue;

	@IsString()
	@IsOptional()
	slug?: string;

	@IsArray()
	@IsOptional()
	authors?: { id: string }[];

	@IsEnum(prismaClient.BlogPostStatus)
	@IsOptional()
	status?: prismaClient.BlogPostStatus;
}

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiBlogPostsAdminHandler {
	constructor() {}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { title, content, slug, authors }: CreateBlogPostDto,
	) {
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
						{ id: req.user.id },
					],
				},
			},
		});

		return { id: post.id };
	}

	@Get("/:id")
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const post = await prisma.blogPost.findUnique({
			where: { id },
			include: {
				authors: { select: { id: true, name: true, image: true } },
			},
		});

		return post;
	}

	@Put("/:id")
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Body(ValidationPipe) {
			title,
			content,
			slug,
			status,
			authors,
		}: UpdateBlogPostDto,
	) {
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
				status: status || undefined,
				publishedAt:
					status === prismaClient.BlogPostStatus.Published ? new Date() : null,
			},
		});

		return post;
	}

	@Delete("/:id")
	public async delete(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		await prisma.blogPost.delete({ where: { id } });

		return { success: true };
	}
}

export default createHandler(ApiBlogPostsAdminHandler);
