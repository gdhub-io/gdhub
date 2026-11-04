import { NovuService } from "@/services/novu";
import SanityService from "@/services/sanity";
import { removeSpecialistFromSearch } from "@/services/typesense/sync";

/** What erasure needs to find the person in each provider, read before the database row is wiped. */
export type ErasureSubject = {
	userId: string;
	email: string | null;
	image: string | null;
	specialityIds: string[];
};

const SANITY_CDN = "https://cdn.sanity.io/";

const step = async (name: string, run: () => Promise<unknown>) => {
	try {
		await run();
	} catch (error) {
		console.error(`[erasure] ${name} failed`, error);
	}
};

/**
 * Removes the person's copies held outside Postgres: the search documents,
 * the notification subscriber and the uploaded avatar. Each provider is
 * best-effort, so one being down never blocks the rest of the erasure.
 */
export async function eraseFromProviders(subject: ErasureSubject) {
	const { userId, email, image, specialityIds } = subject;

	await Promise.all([
		// removeSpecialistFromSearch logs its own failures.
		...specialityIds.map((id) => removeSpecialistFromSearch(id)),
		step("novu subscriber", () => NovuService.deleteSubscriber(userId)),
		// Invitations to an address with no account yet are sent with the email as the subscriber id.
		email
			? step("novu email subscriber", () => NovuService.deleteSubscriber(email))
			: null,
		image?.startsWith(SANITY_CDN)
			? step("sanity avatar", () => SanityService.removeAsset(image))
			: null,
	]);
}
