import client from "@sanity/client";

const UPLOAD_SOURCE = "gdhub-user";

export default class SanityService {
	static initClient() {
		return new client({
			projectId: process.env.SANITY_PROJECT_ID,
			dataset: process.env.SANITY_DATASET,
			apiVersion: "2021-08-31",
			token: process.env.SANITY_TOKEN, // or leave blank for unauthenticated usage
			useCdn: true,
		});
	}

	static async health() {
		const client = SanityService.initClient();
		const res = await client.users.getById("me");

		console.log("[sanity, health]", res);

		return { ok: Boolean(res) };
	}

	static async uploadImage(
		newFilename: string,
		fileBuffer: Buffer,
		uploaderId: string,
	) {
		try {
			const client = SanityService.initClient();

			// `source.id` records the uploader: removeFile deletes only their own assets.
			const response = await client.assets.upload("image", fileBuffer, {
				filename: newFilename,
				source: { name: UPLOAD_SOURCE, id: uploaderId },
			});

			return {
				id: response._id,
				url: response.url,
				originalFilename: response.originalFilename,
				width: response.metadata.dimensions.width,
				height: response.metadata.dimensions.height,
			};
		} catch (error) {
			console.error(`File ${newFilename} didn't load`, error);

			return Promise.reject(error);
		}
	}

	/** Any asset at this URL, whoever uploaded it: server-side only, e.g. erasure. */
	static async removeAsset(url: string) {
		await SanityService.initClient().delete({
			query: `*[_type == "sanity.imageAsset" && url == $url]`,
			params: { url },
		});
	}

	static async removeFile(fileUrl: string, uploaderId: string) {
		if (!fileUrl) throw new Error("fileUrl is empty");

		const client = SanityService.initClient();
		await client.delete({
			query: `*[_type == "sanity.imageAsset" && url == $url && source.name == $source && source.id == $uploaderId]`,
			params: { url: fileUrl, source: UPLOAD_SOURCE, uploaderId },
		});
	}
}
