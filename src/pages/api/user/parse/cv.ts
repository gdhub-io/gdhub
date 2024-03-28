import { NextAuthGuard } from '@/lib/api-middlewares'
import { openAI } from '@/services/openai'
import multer from 'multer'
import { Post, createHandler, UploadedFile, UseMiddleware, BadRequestException, Req, Body } from 'next-api-decorators'
import pdf from 'pdf-parse'

export const config = {
	api: {
		bodyParser: false,
	},
	maxDuration: 300,
}

const upload = multer({ storage: multer.memoryStorage() })

@NextAuthGuard('user')
class UserParseCVHandler {
	constructor() {}

	@Post()
	@UseMiddleware(upload.single('file'))
	public async uploadCV(
		@Req() req: NextApiRequestWithUser,
		@UploadedFile() file: any,
		@Body() { jobPosition, locale }: any
	) {
		try {
			const data = await pdf(file.buffer)

			if (!data) throw new BadRequestException()

			const response = await openAI.parseCV(data.text, jobPosition, {
				locale,
			})

			return response
		} catch (error: any) {
			console.error('uploadCV', error)
			return { success: false }
		}
	}
}

export default createHandler(UserParseCVHandler)
