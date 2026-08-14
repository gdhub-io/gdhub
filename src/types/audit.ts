/**
 * What `AuditLog.source` says about a write. Written by `withAuth`, filtered by
 * the admin API and shown in the table — one vocabulary, declared once.
 * `unknown` is the package's default for a write that ran with no audit context.
 */
export const AUDIT_SOURCES = [
	"api",
	"admin",
	"backend",
	"public_api",
	"cron",
	"webhook",
	"unknown",
] as const;

export type AuditSource = (typeof AUDIT_SOURCES)[number];

export type AuditActorRef = {
	id: string;
	name: string | null;
	image: string | null;
	email: string | null;
};

export type AuditLogRow = {
	id: string;
	createdAt: string;
	action: string;
	status: "OK" | "FAILED";
	entity: string;
	entityId: string | null;
	entityLabel: string | null;
	source: string | null;
	requestId: string | null;
	changes: unknown;
	meta: unknown;
	actor: AuditActorRef | null;
	subject: AuditActorRef | null;
};

export type AuditFacet = { value: string; count: number };

export type AuditLogsResponse = {
	data: AuditLogRow[];
	meta: { currentPage: number; pageCount: number; totalCount: number };
	facets: { actions: AuditFacet[]; entities: AuditFacet[] };
};
