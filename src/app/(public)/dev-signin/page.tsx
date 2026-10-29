import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isE2EAuth } from "@/auth";
import { listFixtureUsers } from "@/repositories/admin/dev-fixture-users";
import { DevSignInClient } from "./DevSignInClient";

export const metadata: Metadata = {
	title: "Sign in as a fixture",
	robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Sign in as one of the fixture accounts.
 *
 * Behind the same `isE2EAuth` the credentials provider uses, imported rather
 * than restated: two copies of a security condition is one too many.
 */
export default async function DevSignInPage() {
	if (!isE2EAuth) notFound();

	return <DevSignInClient users={await listFixtureUsers()} />;
}
