import { randomBytes } from "node:crypto";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { EventType, Prisma } from "@prisma/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import {
	LegalService,
	MENTOR_SIGNATURE_FIELD,
	ORGANIZER_SIGNATURE_FIELD,
} from "@/services/legal";
import { prisma } from "@/services/prisma";
import { resolveMemberCertificateContext } from "../../../_helpers";

// Crockford Base32 — 32 chars, no ambiguous I/L/O/U.
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateCertificateNumber(): string {
	const bytes = randomBytes(6);
	let suffix = "";
	for (let i = 0; i < 6; i++) {
		suffix += CROCKFORD_BASE32[bytes[i] & 0x1f]; // 5 random bits per char
	}
	return `GDH-${suffix}`;
}

export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

	const eventCtx = await resolveMemberCertificateContext(memberId);

	if (!eventCtx || eventCtx.event.id !== id) {
		return apiError.notFound("Member not found");
	}

	if (!isAdmin && eventCtx.event.createdById !== currentUser.id) {
		return apiError.forbidden(
			"You are not allowed to manage certificates for this event",
		);
	}

	if (!eventCtx.event.certificationEnabled) {
		return apiError.badRequest("Certification is not enabled for this event");
	}

	if (eventCtx.member.certificate) {
		return apiError.badRequest(
			"Certificate has already been created for this member",
		);
	}

	const issuedAt = new Date();
	const legalService = new LegalService();

	// Two-phase create: first claim a unique number in the DB with a
	// placeholder externalId, then upload to Documenso, then update the row
	// with the real envelopeId. On Documenso failure we roll the row back
	// so no orphan PDFs are left in Documenso and no orphan rows in the DB.
	let claimedRow: { id: string; number: string } | null = null;
	let lastError: unknown;
	for (let attempt = 0; attempt < 3; attempt++) {
		const candidate = generateCertificateNumber();
		try {
			claimedRow = await prisma.eventCertificate.create({
				data: {
					eventMemberId: eventCtx.member.id,
					number: candidate,
					externalId: `pending:${candidate}`,
					issuedAt,
				},
				select: { id: true, number: true },
			});
			break;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				const target = (error.meta as { target?: string[] } | undefined)
					?.target;
				// Conflict on eventMemberId means a parallel create won — no point retrying.
				if (target?.some((field) => field.includes("eventMemberId"))) {
					return apiError.badRequest(
						"Certificate has already been created for this member",
					);
				}
				lastError = error;
				continue;
			}
			throw error;
		}
	}

	if (!claimedRow) {
		throw lastError instanceof Error
			? lastError
			: new Error("Failed to allocate certificate number");
	}

	// Signers: organizer always, mentor only for GameLab events with a
	// mentor assigned. Matches the signature blocks rendered on the PDF.
	// Each signer carries a pre-placed signature field so Documenso shows
	// the field anchored to the right line in the certificate.
	const signers = [
		{
			name: eventCtx.organizerName,
			email: eventCtx.organizerEmail,
			signatureField: ORGANIZER_SIGNATURE_FIELD,
		},
		...(eventCtx.event.type === "GameLab" &&
		eventCtx.mentorName &&
		eventCtx.mentorEmail
			? [
					{
						name: eventCtx.mentorName,
						email: eventCtx.mentorEmail,
						signatureField: MENTOR_SIGNATURE_FIELD,
					},
				]
			: []),
	];

	try {
		const document = await legalService.createMemberCertificateDocument({
			memberId: eventCtx.member.id,
			memberEmail: eventCtx.member.user.email,
			memberName: eventCtx.participantName,
			certificateNumber: claimedRow.number,
			pdfInput: {
				eventType: eventCtx.event.type,
				organizerName: eventCtx.organizerName,
				organizerTitle: eventCtx.organizerTitle,
				startDate: eventCtx.startDate,
				endDate: eventCtx.endDate,
				participantName: eventCtx.participantName,
				participantPosition: eventCtx.participantPosition,
				projectName: eventCtx.projectName,
				eventTitle: eventCtx.event.title,
				eventShortDescription:
					eventCtx.event.type === EventType.GameLab
						? `GDHub's game-development incubation program`
						: null,
				certificateNumber: claimedRow.number,
				issuedDate: issuedAt,
				mentorName: eventCtx.mentorName,
			},
			signers,
		});

		const certificate = await prisma.eventCertificate.update({
			where: { id: claimedRow.id },
			data: { externalId: document.envelopeId },
		});

		return json({
			id: certificate.id,
			number: certificate.number,
			externalId: certificate.externalId,
			issuedAt: certificate.issuedAt,
			documentId: document.documentId,
		});
	} catch (error) {
		await prisma.eventCertificate
			.delete({ where: { id: claimedRow.id } })
			.catch((rollbackError) => {
				console.error(
					"Failed to roll back certificate row after Documenso error",
					rollbackError,
				);
			});
		throw error;
	}
});

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

	const member = await prisma.eventMember.findUnique({
		where: { id: memberId },
		select: {
			eventId: true,
			event: { select: { createdById: true } },
			certificate: true,
		},
	});

	if (!member || member.eventId !== id) {
		return apiError.notFound("Member not found");
	}

	if (!isAdmin && member.event.createdById !== currentUser.id) {
		return apiError.forbidden(
			"You are not allowed to view certificates for this event",
		);
	}

	if (!member.certificate) return json(null);

	let status: string | null = null;
	const externalId = member.certificate.externalId;
	if (!externalId.startsWith("pending:")) {
		try {
			const envelope = await new LegalService().getEnvelope(externalId);
			status = envelope.status;
		} catch (error) {
			console.error("Failed to fetch envelope status", error);
		}
	}

	return json({
		id: member.certificate.id,
		number: member.certificate.number,
		externalId: member.certificate.externalId,
		issuedAt: member.certificate.issuedAt,
		status,
	});
});

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id, memberId } = (await ctx.params) as {
			id: string;
			memberId: string;
		};
		const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

		const member = await prisma.eventMember.findUnique({
			where: { id: memberId },
			select: {
				eventId: true,
				event: { select: { createdById: true } },
				certificate: true,
			},
		});

		if (!member || member.eventId !== id) {
			return apiError.notFound("Member not found");
		}

		if (!isAdmin && member.event.createdById !== currentUser.id) {
			return apiError.forbidden(
				"You are not allowed to manage certificates for this event",
			);
		}

		if (!member.certificate) {
			return json({ ok: true });
		}

		// Try to delete the envelope in Documenso. Skip the call if the stored
		// externalId is still a `pending:` placeholder (never uploaded), or if
		// Documenso returns 404 — we still want to clean up the DB row.
		const externalId = member.certificate.externalId;
		const legalService = new LegalService();
		if (!externalId.startsWith("pending:")) {
			if (!isAdmin) {
				try {
					const envelope = await legalService.getEnvelope(externalId);
					if (envelope.status === "COMPLETED") {
						return apiError.forbidden(
							"Only administrators can delete a signed certificate",
						);
					}
				} catch (error) {
					console.error(
						"Failed to fetch envelope status before delete; proceeding",
						error,
					);
				}
			}
			try {
				await legalService.deleteEnvelope(externalId);
			} catch (error) {
				console.error(
					"Failed to delete envelope in Documenso, removing local row anyway",
					error,
				);
			}
		}

		await prisma.eventCertificate.delete({
			where: { id: member.certificate.id },
		});

		return json({ ok: true });
	},
);
