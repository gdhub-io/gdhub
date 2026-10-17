import type { Prisma } from "@gdhub-io/gdhub-prisma";
import {
	LEGAL_CODES,
	LEGAL_DOCUMENTS,
	type LegalCode,
} from "@/config/legal/registry";
import { acceptanceValidUntil } from "@/lib/legal/versions";
import { prisma } from "@/services/prisma";

export type AcceptanceFilters = {
	search?: string;
	code?: string;
	version?: number;
	context?: string;
	from?: Date;
	to?: Date;
};

export type AcceptanceRow = {
	id: string;
	user: { id: string; name: string | null; email: string | null };
	code: string;
	title: string;
	version: number;
	context: string;
	subject: string | null;
	acceptedAt: string;
	/** Date the acceptance stops binding; null while it still does. */
	validUntil: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	checksum: string;
};

function where(filters: AcceptanceFilters): Prisma.LegalAcceptanceWhereInput {
	const search = filters.search?.trim();
	return {
		...(filters.code ? { code: filters.code } : {}),
		...(filters.version ? { version: filters.version } : {}),
		...(filters.context ? { context: filters.context } : {}),
		...(filters.from || filters.to
			? {
					acceptedAt: {
						...(filters.from ? { gte: filters.from } : {}),
						...(filters.to ? { lte: filters.to } : {}),
					},
				}
			: {}),
		...(search
			? {
					user: {
						OR: [
							{ name: { contains: search, mode: "insensitive" } },
							{ email: { contains: search, mode: "insensitive" } },
						],
					},
				}
			: {}),
	};
}

const select = {
	id: true,
	code: true,
	version: true,
	context: true,
	acceptedAt: true,
	ipAddress: true,
	userAgent: true,
	checksum: true,
	user: { select: { id: true, name: true, email: true } },
	project: { select: { name: true } },
	checkpoint: {
		select: { stageName: true, project: { select: { name: true } } },
	},
} satisfies Prisma.LegalAcceptanceSelect;

type Selected = Prisma.LegalAcceptanceGetPayload<{ select: typeof select }>;

const isLegalCode = (code: string): code is LegalCode =>
	(LEGAL_CODES as string[]).includes(code);

const title = (code: string) =>
	isLegalCode(code) ? LEGAL_DOCUMENTS[code].title : code;

const toRow = (r: Selected): AcceptanceRow => ({
	id: r.id,
	user: r.user,
	code: r.code,
	title: title(r.code),
	version: r.version,
	context: r.context,
	subject:
		r.project?.name ??
		(r.checkpoint
			? `${r.checkpoint.project.name} · ${r.checkpoint.stageName}`
			: null),
	acceptedAt: r.acceptedAt.toISOString(),
	validUntil: isLegalCode(r.code)
		? acceptanceValidUntil(r.code, r.version)
		: null,
	ipAddress: r.ipAddress,
	userAgent: r.userAgent,
	checksum: r.checksum,
});

export async function listAcceptances(
	filters: AcceptanceFilters,
	page: number,
	limit: number,
) {
	const w = where(filters);
	const [total, rows] = await Promise.all([
		prisma.legalAcceptance.count({ where: w }),
		prisma.legalAcceptance.findMany({
			where: w,
			select,
			orderBy: { acceptedAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
	]);
	return { total, rows: rows.map(toRow) };
}

/** The export's ceiling: a dispute or a regulator asks for a slice, not the table. */
const EXPORT_LIMIT = 50_000;

export async function exportAcceptances(filters: AcceptanceFilters) {
	const rows = await prisma.legalAcceptance.findMany({
		where: where(filters),
		select,
		orderBy: { acceptedAt: "asc" },
		take: EXPORT_LIMIT,
	});
	return rows.map(toRow);
}

const cell = (value: string | number | null) => {
	const text = value === null ? "" : String(value);
	// Quotes doubled per RFC 4180; a leading formula character is neutralised for spreadsheets.
	const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
	return `"${safe.replaceAll('"', '""')}"`;
};

export function acceptancesCsv(rows: AcceptanceRow[]): string {
	const header = [
		"accepted_at_utc",
		"valid_until",
		"user_id",
		"user_email",
		"document",
		"version",
		"context",
		"project_or_checkpoint",
		"ip_address",
		"user_agent",
		"checksum",
	];
	const lines = rows.map((r) =>
		[
			r.acceptedAt,
			r.validUntil ?? "current",
			r.user.id,
			r.user.email,
			r.code,
			r.version,
			r.context,
			r.subject,
			r.ipAddress,
			r.userAgent,
			r.checksum,
		]
			.map(cell)
			.join(","),
	);
	return [header.join(","), ...lines].join("\r\n");
}
