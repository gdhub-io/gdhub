import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { LEGAL_ENTITIES } from "@/config/legal/entities";
import {
	LEGAL_CODES,
	type LegalCode,
	type LegalContext,
	legalDocument,
} from "@/config/legal/registry";
import {
	type LegalParams,
	legalChecksum,
	readLegalFile,
	renderLegalText,
} from "./documents";
import { versionInEffect } from "./versions";

/** What a form sends for each ticked checkbox: the document and the version it showed. */
const LegalAcceptanceInputSchema = z.object({
	code: z.enum(LEGAL_CODES),
	version: z.number().int().positive(),
});
export type LegalAcceptanceInput = z.infer<typeof LegalAcceptanceInputSchema>;

export const LegalAcceptancesSchema = z.array(LegalAcceptanceInputSchema);

export type LegalErrorReason = "required" | "outdated" | "unpublished";

export class LegalError extends Error {
	constructor(
		readonly reason: LegalErrorReason,
		readonly code: LegalCode,
	) {
		super(`legal.${reason}: ${code}`);
	}
}

export type RequestMeta = {
	ipAddress: string | null;
	userAgent: string | null;
};

type Tx = {
	legalAcceptance: {
		createMany: (args: {
			data: Prisma.LegalAcceptanceCreateManyInput[];
		}) => Promise<unknown>;
	};
};

export type AcceptLegalArgs = {
	userId: string;
	context: LegalContext;
	meta: RequestMeta;
	checkpointId?: string;
	projectId?: string;
	params?: LegalParams;
	now?: Date;
};

/**
 * The rows that record `userId` accepting each of `required`, as the form sent
 * them — or a `LegalError` when a box is missing, outdated or has no text yet.
 * Pure, so an action can refuse before it touches the database.
 */
export function resolveLegal(
	sent: LegalAcceptanceInput[] | undefined,
	required: LegalCode[],
	args: AcceptLegalArgs,
): Prisma.LegalAcceptanceCreateManyInput[] {
	return required.map((code) => {
		const current = versionInEffect(code, args.now);
		if (!current) throw new LegalError("unpublished", code);
		const given = sent?.find((s) => s.code === code);
		if (!given) throw new LegalError("required", code);
		if (given.version !== current.version) {
			throw new LegalError("outdated", code);
		}
		const checksum = legalDocument(code).withParams
			? legalChecksum(
					renderLegalText(
						readLegalFile(code, current.version),
						LEGAL_ENTITIES[current.entity],
						args.params,
					),
				)
			: current.checksum;
		return {
			userId: args.userId,
			code,
			version: current.version,
			checksum,
			context: args.context,
			checkpointId: args.checkpointId ?? null,
			projectId: args.projectId ?? null,
			params: args.params,
			ipAddress: args.meta.ipAddress,
			userAgent: args.meta.userAgent,
		};
	});
}

/**
 * Records the acceptances inside the action's own transaction, so the action
 * never happens without the record and the record never exists without it.
 */
export async function acceptLegal(
	tx: Tx,
	sent: LegalAcceptanceInput[] | undefined,
	required: LegalCode[],
	args: AcceptLegalArgs,
) {
	await tx.legalAcceptance.createMany({
		data: resolveLegal(sent, required, args),
	});
}
