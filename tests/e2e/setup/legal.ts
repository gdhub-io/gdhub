import type { LegalCode } from "../../../src/config/legal/registry";
import { resolveLegal } from "../../../src/lib/legal/accept";
import { versionInEffect } from "../../../src/lib/legal/versions";
import { prisma } from "../../../src/services/prisma";

/** What a form sends for the documents it ticked, at the version in effect. */
export const accepted = (...codes: LegalCode[]) =>
	codes.map((code) => ({
		code,
		version: versionInEffect(code)?.version ?? 1,
	}));

/** Signed up the usual way, so no re-acceptance modal stands in front of the page. */
export const acceptTermsOfUse = (userId: string) =>
	prisma.legalAcceptance.createMany({
		data: resolveLegal(accepted("TermsOfUse"), ["TermsOfUse"], {
			userId,
			context: "SignUp",
			meta: { ipAddress: null, userAgent: "playwright" },
		}),
	});
