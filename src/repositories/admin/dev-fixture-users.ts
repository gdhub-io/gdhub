import { prisma } from "@/services/prisma";

/** Narrowing by domain is what keeps this from listing real people. */
const FIXTURE_DOMAINS = ["@livinitlarge.net", "@gdhub.local"];

export type FixtureUser = {
	email: string;
	name: string;
	image: string | null;
	/** What the account can do, read off its own rows. */
	badges: string[];
};

/**
 * The test accounts a developer may sign in as — the throwaway database's
 * fixtures, never the real people that share it.
 *
 * Callers are responsible for the `isE2EAuth` gate: this only knows which rows
 * are fixtures, not who is allowed to see them.
 */
export async function listFixtureUsers(): Promise<FixtureUser[]> {
	const rows = await prisma.user.findMany({
		where: {
			OR: FIXTURE_DOMAINS.map((domain) => ({ email: { endsWith: domain } })),
		},
		select: {
			email: true,
			name: true,
			image: true,
			isSuperAdmin: true,
			profile: { select: { name: true } },
			spaceMembers: {
				where: { revokedAt: null },
				select: { spaceType: true, role: true },
			},
			specialities: {
				where: { isOpenForMentoring: true },
				select: { name: true },
			},
		},
		orderBy: { email: "asc" },
	});

	return rows.map((row) => ({
		email: row.email ?? "",
		name: row.profile?.name || row.name || row.email || "Unnamed",
		image: row.image,
		// Read off the rows, not the email: a renamed fixture should not start lying.
		badges: [
			...(row.isSuperAdmin ? ["super admin"] : []),
			...row.spaceMembers.map(
				(member) => `${member.spaceType} · ${member.role.toLowerCase()}`,
			),
			...(row.specialities.length > 0 ? ["advisor"] : []),
		],
	}));
}
