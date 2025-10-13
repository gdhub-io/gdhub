import { createHmac } from "crypto";
import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";

@NextAuthGuard("user")
class ApiServiceNovuHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		const signature = createHmac(
			"sha256",
			process.env.NOVU_API_SECRET as string,
		)
			.update(req.user.id as string)
			.digest("hex");

		return { signature };
	}
}

export default createHandler(ApiServiceNovuHandler);
