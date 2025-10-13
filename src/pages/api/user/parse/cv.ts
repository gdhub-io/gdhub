import multer from "multer";
import {
	BadRequestException,
	Body,
	createHandler,
	HttpException,
	Post,
	Req,
	UploadedFile,
	UseMiddleware,
} from "next-api-decorators";
import pdf from "pdf-parse";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { openAI } from "@/services/openai";

export const config = {
	api: {
		bodyParser: false,
	},
	maxDuration: 300,
};

const upload = multer({ storage: multer.memoryStorage() });

@NextAuthGuard("user")
class UserParseCVHandler {
	constructor() {}

	@Post()
	@UseMiddleware(upload.single("file"))
	public async uploadCV(
		@Req() req: NextApiRequestWithUser,
		@UploadedFile() file: any,
		@Body() { jobPosition, locale }: any,
	) {
		try {
			const data = await pdf(file.buffer);

			if (!data) throw new BadRequestException();

			const response = await openAI.parseCV(data.text, jobPosition, {
				locale,
			});

			return response;
		} catch (error: any) {
			console.error("uploadCV", error);

			throw new HttpException(error.status, error.error.message);
		}
	}
}

export default createHandler(UserParseCVHandler);
