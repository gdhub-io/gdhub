import client from '@sanity/client'

export default class SanityService {
	static initClient() {
		return new client({
			projectId: process.env.SANITY_PROJECT_ID,
			dataset: process.env.SANITY_DATASET,
			token: process.env.SANITY_TOKEN, // or leave blank for unauthenticated usage
			useCdn: true,
		})
	}

	static async uploadImage(newFilename: string, fileBuffer: Buffer, tag?: string) {
		try {
			const client = this.initClient()
			const response = await client.assets.upload('image', fileBuffer, { filename: newFilename })

			return {
				id: response._id,
				url: response.url,
				originalFilename: response.originalFilename,
				width: response.metadata.dimensions.width,
				height: response.metadata.dimensions.height,
			}
		} catch (error) {
			console.error(`File ${newFilename} didn't load`, error)

			return Promise.reject(error)
		}
	}

	static async removeFile(fileUrl: string) {
		try {
			if (!fileUrl) throw new Error('fileUrl is empty')

			const client = this.initClient()
			const response = await client.delete({ query: `*[_type == "sanity.imageAsset" && url == "${fileUrl}"]` })

			console.log('[Remove File]', response)
			return Promise.resolve()
		} catch (error: any) {
			console.error(error.message)
			return Promise.reject()
		}
	}
}
