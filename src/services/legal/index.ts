import { Documenso } from "@documenso/sdk-typescript";
import {
	type DocumentCreateRecipient,
	DocumentCreateRole,
} from "@documenso/sdk-typescript/models/operations";
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
		memberEmail,
		memberName,
		certificateNumber,
		pdfInput,
		signers,
	}: {
		memberId: string;
		memberEmail?: string | null;
		memberName: string;
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

		const recipients: DocumentCreateRecipient[] = signers
			.filter((s) => s.email && s.name)
			.map((signer, index) => ({
				email: signer.email,
				name: signer.name,
				role: DocumentCreateRole.Signer,
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

		// Add event member as CC (receives a copy of the signed document)
		if (memberEmail) {
			recipients.push({
				email: memberEmail,
				name: memberName,
				role: DocumentCreateRole.Cc,
				signingOrder: recipients.length + 1,
				fields: undefined,
			});
		}

		const result = await this.instance.documents.create({
			payload: {
				title,
				externalId: `cert:eventMember:${memberId}`,
				recipients: recipients.length ? recipients : undefined,
				folderId: process.env.LEGAL_DOCUMENT_SIGNING_EVENT_FOLDER_ID,
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

	async downloadSignedDocument(envelopeId: string): Promise<{
		bytes: Uint8Array;
		contentType: string;
		filename: string | null;
	}> {
		const envelope = await this.instance.envelopes.get({ envelopeId });
		const [item] = envelope.envelopeItems;
		if (!item) {
			throw new Error("Envelope has no items to download");
		}

		// The Documenso endpoint streams binary PDF rather than JSON, so we
		// bypass the SDK helper (which only parses JSON) and fetch raw bytes.
		const baseUrl = (
			process.env.LEGAL_DOCUMENT_SIGNING_SERVER_URL ?? ""
		).replace(/\/$/, "");
		const apiKey = process.env.LEGAL_DOCUMENT_SIGNING_AUTH_TOKEN ?? "";
		const url = `${baseUrl}/envelope/item/${encodeURIComponent(item.id)}/download?version=signed`;

		const response = await fetch(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${apiKey}` },
		});
		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(
				`Failed to download envelope item (${response.status}): ${body}`,
			);
		}

		const buffer = await response.arrayBuffer();
		const disposition = response.headers.get("content-disposition");
		const match = disposition?.match(/filename="?([^";]+)"?/i);
		return {
			bytes: new Uint8Array(buffer),
			contentType: response.headers.get("content-type") ?? "application/pdf",
			filename: match?.[1] ?? null,
		};
	}

	async deleteEnvelope(envelopeId: string) {
		return await this.instance.envelopes.delete({ envelopeId });
	}

	async distributeEnvelope(envelopeId: string) {
		return await this.instance.envelopes.distribute({ envelopeId });
	}

	// Documenso UI host — strips the trailing /api/v2 from the SDK base URL.
	getUiHost(): string {
		const apiUrl = process.env.LEGAL_DOCUMENT_SIGNING_SERVER_URL ?? "";
		return apiUrl.replace(/\/api\/v2\/?$/, "");
	}

	getDocumentUrl({
		teamUrl,
		envelopeId,
	}: {
		teamUrl: string;
		envelopeId: string;
	}): string {
		return `${this.getUiHost()}/t/${teamUrl}/documents/${envelopeId}`;
	}
}
