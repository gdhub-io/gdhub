import { Documenso } from '@documenso/sdk-typescript'

export class SignDocumentService {
	private instance: Documenso

	constructor() {
		this.instance = new Documenso({
			serverURL: process.env.DOCUMENSO_SERVER_URL,
			apiKey: process.env.DOCUMENSO_API_KEY,
		})
	}
}
