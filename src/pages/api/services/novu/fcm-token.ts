import { IsOptional, IsString } from "class-validator";
import {
	Body,
	createHandler,
	Post,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { NovuService } from "@/services/novu";

class UpdateFcmTokenDto {
	@IsString()
	token: string;

	@IsString()
	@IsOptional()
	integrationIdentifier?: string;
}

@NextAuthGuard("user")
class ApiServiceNovuFcmTokenHandler {
	@Post()
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) body: UpdateFcmTokenDto,
	) {
		await NovuService.updateFcmDeviceTokens({
			subscriberId: req.user.id,
			deviceTokens: [body.token],
			integrationIdentifier: body.integrationIdentifier,
		});

		return { success: true };
	}
}

export default createHandler(ApiServiceNovuFcmTokenHandler);
