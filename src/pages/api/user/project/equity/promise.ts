import { IsNotEmpty, IsString } from "class-validator";
import { createHandler, Get, Query, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class GetMemberPromiseDto {
	@IsString()
	@IsNotEmpty()
	promiseId: string;
}

@NextAuthGuard("user")
class ApiMemberPromiseHandler {
	@Get()
	public async getMemberPromise(
		@Req() req: NextApiRequestWithUser,
		@Query() { promiseId }: GetMemberPromiseDto,
	) {
		const promise = await prisma.equityPromise.findUnique({
			where: { id: promiseId },
		});

		if (!promise) {
			throw new Error("Promise not found");
		}

		return promise;
	}
}

export default createHandler(ApiMemberPromiseHandler);
