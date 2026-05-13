import { DocusealApi } from "@docuseal/api";

export class SignDocumentService {
	private instance: DocusealApi;

	constructor() {
		this.instance = new DocusealApi({
			url: process.env.LEGAL_DOCUMENT_SIGNING_SERVER_URL,
			key: process.env.LEGAL_DOCUMENT_SIGNING_AUTH_TOKEN,
		});
	}
}
