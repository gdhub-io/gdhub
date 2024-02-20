import { promises as fs } from 'fs'
import { env } from '@/helpers/env'
import { NextAuthGuard } from '@/lib/api-middlewares'
import SanityService from '@/services/sanity'
import { IsString } from 'class-validator'
import { IncomingForm } from 'formidable'
import { Delete, PayloadTooLargeException, Post, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadImageResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         width:
 *           type: integer
 *         height:
 *           type: integer
 *         url:
 *           type: string
 *         originalFilename:
 *           type: string
 *           required: false
 */

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
	/**
	 * @swagger
	 * /api/file:
	 *   post:
	 *     tags:
	 *       - Images
	 *     summary: Upload image file
	 *     requestBody:
	 *       content:
	 *         multipart/form-data:
	 *           schema:
	 *             type: object
	 *             required: file
	 *             properties:
	 *               file:
	 *                 type: string
	 *                 format: binary
	 *               filename:
	 *                 type: string
	 *               tag:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Image was deleted. No content
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/UploadImageResponse'
	 */
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

		if (file.size > 1024 * 1024 * env('UPLOAD_FILE_FOR_REPORT_MAX_SIZE', 5)) throw new PayloadTooLargeException()

		const response = await SanityService.uploadImage(
			fData.fields?.filename || file.newFilename,
			data,
			fData.fields?.tag
		)

		return response
	}

	/**
	 * @swagger
	 * /api/file:
	 *   delete:
	 *     tags:
	 *       - Images
	 *     summary: Delete image file
	 *     parameters:
	 *       - name: fileUrl
	 *         in: query
	 *         schema:
	 *         type: string
	 *     responses:
	 *       204:
	 *         description: Image was deleted. No content
	 */
	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { fileUrl }: DeleteImageDto) {
		await SanityService.removeFile(fileUrl)
	}
}

export default createHandler(ApiUploadFileHandler)
