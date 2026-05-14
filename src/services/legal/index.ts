import { Documenso } from "@documenso/sdk-typescript";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	type EventCertificateTemplateInput,
	renderEventCertificatePdf,
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

	async createEventCertificateDocument({
		eventId,
		eventTitle,
		eventType,
		organizerName,
		organizerTitle,
		startDate,
		endDate,
	}: {
		eventId: string;
		eventTitle: string;
		eventType: prismaClient.$Enums.EventType;
		organizerName: string;
		organizerTitle: string;
		startDate: Date | null;
		endDate: Date | null;
	}): Promise<{ documentId: number; envelopeId: string; title: string }> {
		const pdfBytes = await this.generateEventCertificatePdf({
			eventType,
			organizerName,
			organizerTitle,
			startDate,
			endDate,
		});
		const title = `Certificate — ${eventTitle}`;

		const result = await this.instance.documents.create({
			payload: {
				title,
				externalId: `event:${eventId}`,
			},
			file: {
				fileName: "certificate.pdf",
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
}
