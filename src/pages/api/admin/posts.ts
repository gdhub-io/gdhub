import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiBlogPostsAdminHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const posts = await prisma.blogPost.findMany({
			include: { authors: { select: { id: true, name: true, image: true } } },
		});

		return posts;
	}
}

export default createHandler(ApiBlogPostsAdminHandler);
