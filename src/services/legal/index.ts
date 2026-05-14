import { Documenso } from "@documenso/sdk-typescript";
import {
	type EventCertificateTemplateInput,
	renderEventCertificatePdf,
	type SignatureFieldPosition,
} from "./templates/event-certificate-template";

export {
	MENTOR_SIGNATURE_FIELD,
	ORGANIZER_SIGNATURE_FIELD,
	type SignatureFieldPosition,
} from "./templates/event-certificate-template";

export class LegalService {
	private instance: Documenso;

	constructor() {
		this.instance = new Documenso({
			serverURL: process.env.LEGAL_DOCUMENT_SIGNING_SERVER_URL,
			apiKey: process.env.LEGAL_DOCUMENT_SIGNING_AUTH_TOKEN,
		});
	}

	async generateEventCertificatePdf(
		input: EventCertificateTemplateInput,
	): Promise<Uint8Array> {
		return renderEventCertificatePdf(input);
	}

	async createMemberCertificateDocument({
		memberId,
		certificateNumber,
		pdfInput,
		signers,
	}: {
		memberId: string;
		certificateNumber: string;
		pdfInput: EventCertificateTemplateInput;
		signers: Array<{
			name: string;
			email: string;
			signatureField?: SignatureFieldPosition;
		}>;
	}): Promise<{ documentId: number; envelopeId: string; title: string }> {
		const pdfBytes = await renderEventCertificatePdf(pdfInput);
		const participantName = pdfInput.participantName?.trim() || "participant";
		const title = `Certificate ${certificateNumber} — ${participantName}`;

		const recipients = signers
			.filter((s) => s.email && s.name)
			.map((signer, index) => ({
				email: signer.email,
				name: signer.name,
				role: "SIGNER" as const,
				signingOrder: index + 1,
				fields: signer.signatureField
					? [
							{
								type: "SIGNATURE" as const,
								pageNumber: signer.signatureField.pageNumber,
								pageX: signer.signatureField.pageX,
								pageY: signer.signatureField.pageY,
								width: signer.signatureField.width,
								height: signer.signatureField.height,
							},
						]
					: undefined,
			}));

		const result = await this.instance.documents.create({
			payload: {
				title,
				externalId: `cert:eventMember:${memberId}`,
				recipients: recipients.length ? recipients : undefined,
			},
			file: {
				fileName: `${certificateNumber}.pdf`,
				content: pdfBytes,
			},
		});

		return {
			documentId: result.id,
			envelopeId: result.envelopeId,
			title,
		};
	}

	async getDocument(id: number) {
		return await this.instance.documents.get({ documentId: id });
	}

	async getEnvelope(envelopeId: string) {
		return await this.instance.envelopes.get({ envelopeId });
	}

	async deleteEnvelope(envelopeId: string) {
		return await this.instance.envelopes.delete({ envelopeId });
	}

	async distributeEnvelope(envelopeId: string) {
		return await this.instance.envelopes.distribute({ envelopeId });
	}

	// Documenso UI URL — strips the trailing /api/v2 from the SDK base URL
	// and uses the team slug from the envelope to build the final path.
	getDocumentUrl({
		teamUrl,
		envelopeId,
	}: {
		teamUrl: string;
		envelopeId: string;
	}): string {
		const apiUrl = process.env.LEGAL_DOCUMENT_SIGNING_SERVER_URL ?? "";
		const uiBase = apiUrl.replace(/\/api\/v2\/?$/, "");
		return `${uiBase}/t/${teamUrl}/documents/${envelopeId}`;
	}
}
