import { IsString } from "class-validator";
import type { NextApiResponse } from "next";
import { Body, createHandler, Post, Res } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";

class RevalidatePageDTO {
	@IsString()
	slug: string;
}

@NextAuthGuard("user")
class ApiProjectsHandler {
	constructor() {}

	@Post()
	public async revalidatePage(
		@Res() res: NextApiResponse,
		@Body() { slug }: RevalidatePageDTO,
	) {
		await res.revalidate(slug);

		return { revalidated: true };
	}
}

export default createHandler(ApiProjectsHandler);
