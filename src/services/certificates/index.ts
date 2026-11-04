import { randomBytes } from "node:crypto";
import {
	type CertificateSource,
	Prisma,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

// Crockford Base32 — 32 chars, no ambiguous I/L/O/U.
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** `GDH-` and six random Base32 characters — about a billion numbers, checked unique on insert. */
export function generateCertificateNumber(): string {
	const bytes = randomBytes(6);
	let suffix = "";
	for (let i = 0; i < 6; i++) {
		suffix += CROCKFORD_BASE32[bytes[i] & 0x1f]; // 5 random bits per char
	}
	return `GDH-${suffix}`;
}

export type IssueCertificateInput =
	| { source: "Course"; userId: string; courseGroupStudentId: string }
	| { source: "Checkpoint"; userId: string; checkpointId: string };

/**
 * Issues a course or checkpoint certificate. Unsigned by design: the public
 * `/verify` page is what proves it. Event certificates keep their own
 * Documenso flow. A number collision retries; issuing twice for the same
 * student or checkpoint member is refused by the unique keys.
 */
export async function issueCertificate(input: IssueCertificateInput) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			return await prisma.certificate.create({
				data: {
					...input,
					source: input.source as CertificateSource,
					number: generateCertificateNumber(),
					issuedAt: new Date(),
				},
				select: { id: true, number: true, issuedAt: true },
			});
		} catch (error) {
			const target =
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
					? ((error.meta as { target?: string[] } | undefined)?.target ?? [])
					: null;
			if (!target?.some((field) => field.includes("number"))) throw error;
		}
	}
	throw new Error("Could not find a free certificate number");
}

/**
 * The record of a closed checkpoint, issued to the project and carried by its
 * founder — named on it so the result is not anonymous. Never blocks the close:
 * one already issued, or a project with no founder left, is skipped.
 */
export async function issueCheckpointCertificate(checkpointId: string) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			project: {
				select: {
					team: {
						select: {
							members: {
								where: { status: TeamMemberStatus.Founder },
								select: { userId: true },
								take: 1,
							},
						},
					},
				},
			},
		},
	});
	const founderId = checkpoint?.project?.team?.members[0]?.userId;
	if (!founderId) return null;

	try {
		return await issueCertificate({
			source: "Checkpoint",
			userId: founderId,
			checkpointId,
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		)
			return null;
		throw error;
	}
}
