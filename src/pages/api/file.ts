import { promises as fs } from 'fs'
import { NextAuthGuard } from '@/lib/api-middlewares'
import SanityService from '@/services/sanity'
import { IsString } from 'class-validator'
import { IncomingForm } from 'formidable'
import { Delete, Post, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class DeleteImageDto {
	@IsString()
	fileUrl: string
}

/* Don't miss that! */
export const config = {
	api: {
		bodyParser: false,
	},
}

@NextAuthGuard('user')
class ApiUploadFileHandler {
	@Post()
	public async upload(@Req() req: NextApiRequestWithUser) {
		const fData = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
			const form = new IncomingForm({
				multiples: false,
			})

			form.parse(req, (err, fields, files) => {
				if (err) return reject(err)
				resolve({ fields, files })
			})
		})

		const file = fData.files.file
		const data = await fs.readFile(file.filepath)

		const response = await SanityService.uploadImage(
			fData.fields?.filename || file.newFilename,
			data,
			fData.fields?.tag
		)

		return response
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { fileUrl }: DeleteImageDto) {
		return await SanityService.removeFile(fileUrl)
	}
}

export default createHandler(ApiUploadFileHandler)
