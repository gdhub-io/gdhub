import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";

class GetLiveTokenParamDto {
	@IsString()
	roomName: string;
}

@NextAuthGuard("user")
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { roomName }: GetLiveTokenParamDto,
	) {
		const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
			method: "post",
			body: JSON.stringify({
				properties: {
					room_name: req.user.roles?.includes(prismaClient.UserRole.Admin)
						? undefined
						: roomName,
					is_owner:
						req.user.roles?.includes(prismaClient.UserRole.Admin) || false,
					user_name: req.user.name,
					enable_screenshare: true,
					lang: "user",
					permissions: {
						hasPresence: true,
						canSend: true,
						canAdmin:
							req.user.roles?.includes(prismaClient.UserRole.Admin) || false,
					},
				},
			}),
			headers: {
				Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
			},
		});

		const data = await response.json();

		return { token: data.token };
	}
}

export default createHandler(ApiSpecialistHandler);
