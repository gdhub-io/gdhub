import {
	LEGAL_CODES,
	LEGAL_DOCUMENTS,
	type LegalCode,
} from "@/config/legal/registry";
import { prisma } from "@/services/prisma";

export type MyAcceptance = {
	id: string;
	code: LegalCode;
	title: string;
	version: number;
	context: string;
	acceptedAt: string;
	/** The exact text accepted; a project agreement has no public page yet. */
	href: string | null;
	subject: string | null;
};

export type MyCertificate = {
	id: string;
	number: string;
	source: "Event" | "Course" | "Checkpoint";
	title: string;
	issuedAt: string;
};

const isLegalCode = (code: string): code is LegalCode =>
	(LEGAL_CODES as string[]).includes(code);

/** Everything one user accepted and was issued — scoped by `userId`, nobody else's rows. */
export async function myDocuments(userId: string) {
	const [acceptances, certificates] = await Promise.all([
		prisma.legalAcceptance.findMany({
			where: { userId },
			orderBy: { acceptedAt: "desc" },
			select: {
				id: true,
				code: true,
				version: true,
				context: true,
				acceptedAt: true,
				project: { select: { name: true } },
				checkpoint: {
					select: { stageName: true, project: { select: { name: true } } },
				},
			},
		}),
		prisma.certificate.findMany({
			where: { userId, revokedAt: null },
			orderBy: { issuedAt: "desc" },
			select: {
				id: true,
				number: true,
				source: true,
				issuedAt: true,
				externalId: true,
				eventMember: { select: { event: { select: { title: true } } } },
				courseGroupStudent: {
					select: { group: { select: { course: { select: { name: true } } } } },
				},
				checkpoint: {
					select: { stageName: true, project: { select: { name: true } } },
				},
			},
		}),
	]);

	return {
		acceptances: acceptances.flatMap((row): MyAcceptance[] => {
			if (!isLegalCode(row.code)) return [];
			const doc = LEGAL_DOCUMENTS[row.code];
			return [
				{
					id: row.id,
					code: row.code,
					title: doc.title,
					version: row.version,
					context: row.context,
					acceptedAt: row.acceptedAt.toISOString(),
					href:
						"withParams" in doc ? null : `/legal/${doc.slug}/v${row.version}`,
					subject:
						row.project?.name ??
						(row.checkpoint
							? `${row.checkpoint.project.name} · ${row.checkpoint.stageName}`
							: null),
				},
			];
		}),
		// An event certificate still waiting for its signature is not issued yet.
		certificates: certificates
			.filter((c) => !c.externalId?.startsWith("pending:"))
			.map(
				(c): MyCertificate => ({
					id: c.id,
					number: c.number,
					source: c.source,
					issuedAt: c.issuedAt.toISOString(),
					title:
						c.eventMember?.event.title ??
						c.courseGroupStudent?.group.course.name ??
						(c.checkpoint
							? `${c.checkpoint.project.name} · ${c.checkpoint.stageName}`
							: c.number),
				}),
			),
	};
}
