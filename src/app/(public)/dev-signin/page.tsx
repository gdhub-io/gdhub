import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isE2EAuth } from "@/auth";
import { prisma } from "@/services/prisma";
import { DevSignInClient, type FixtureUser } from "./DevSignInClient";

export const metadata: Metadata = {
	title: "Sign in as a fixture",
	robots: { index: false, follow: false },
};

/** Narrowing by domain is what keeps this from listing real people. */
const FIXTURE_DOMAINS = ["@livinitlarge.net", "@gdhub.local"];

export const dynamic = "force-dynamic";

/**
 * Sign in as one of the fixture accounts.
 *
 * Behind the same `isE2EAuth` the credentials provider uses, imported rather
 * than restated: two copies of a security condition is one too many.
 */
export default async function DevSignInPage() {
	if (!isE2EAuth) notFound();

	const rows = await prisma.user.findMany({
		where: {
			OR: FIXTURE_DOMAINS.map((domain) => ({ email: { endsWith: domain } })),
		},
		select: {
			id: true,
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

	const users: FixtureUser[] = rows.map((row) => ({
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

	return <DevSignInClient users={users} />;
}
