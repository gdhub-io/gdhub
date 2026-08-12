import type { Prisma, SkillLevel } from "@gdhub-io/gdhub-prisma";
import { env } from "@/helpers/env";
import { brevoApi } from "@/services/brevo";
import { cacheDelete, cached } from "@/services/cache";
import { prisma } from "@/services/prisma";

/**
 * The list every registered user lands in. Registration already puts them there
 * (see the onboarding resources route), so a sync only has to keep the
 * attributes honest — but passing the id makes the import idempotent for
 * contacts that fell out of the list.
 *
 * Overridable so a developer can point a local run at a throwaway list instead
 * of the one the newsletter actually sends to.
 */
export const brevoSubscribersListId = () =>
	Number(env("BREVO_SUBSCRIBERS_LIST_ID", "2"));

/**
 * Whether a sync is allowed to write to Brevo.
 *
 * The local database is full of seeded users who exist nowhere in Brevo, and
 * both sync paths upsert — so an unguarded run from a laptop would *create*
 * hundreds of fake contacts in the live list. Writing is therefore opt-in
 * outside production, and every other environment previews instead.
 */
export const isDryRunByDefault = () =>
	process.env.NODE_ENV !== "production" &&
	env<string>("BREVO_SYNC_ALLOW_WRITE", "0") !== "1";

/**
 * Free-form attributes this app owns, safe to create when an account lacks
 * them. The app is the source of truth: their values are overwritten on every
 * sync.
 */
const PLAIN_ATTRIBUTES = [
	{ name: "FIRSTNAME", type: "text" },
	{ name: "DIRECTIONS", type: "text" },
	{ name: "ONBOARDING_DONE", type: "boolean" },
	{ name: "HAS_SUBSCRIBE_TO_NEWSLETTER", type: "boolean" },
] as const;

/**
 * Attributes Brevo stores as a *category*: a curated list of labels, each with
 * an id. Writing one accepts the label and resolves it to the id — but a label
 * that is not in the enumeration is **silently dropped**. The API still answers
 * 201, and the field simply never appears on the contact.
 *
 * That is the failure this whole feature exists to fix, so these are never
 * auto-created (the enumeration is an editorial decision made in Brevo) and the
 * values we are about to send are checked against it instead.
 */
const CATEGORY_ATTRIBUTES = ["MAIN_INTEREST", "LEVEL", "MAIN_LOCALE"] as const;

type CategoryAttribute = (typeof CATEGORY_ATTRIBUTES)[number];

/** A value the app holds that Brevo would quietly refuse to store. */
export type UnsupportedValue = {
	attribute: CategoryAttribute;
	value: string;
	userCount: number;
};

/** Labels each category attribute currently accepts, upper-cased for matching. */
async function readCategoryLabels(): Promise<Map<string, Set<string>>> {
	const { data } = await brevoApi.contacts.getAttributes();
	const labels = new Map<string, Set<string>>();

	for (const attribute of data.attributes ?? []) {
		if (attribute.category !== "category") continue;

		labels.set(
			attribute.name.toUpperCase(),
			new Set(
				(attribute.enumeration ?? []).map((entry) =>
					String(entry.label).toUpperCase(),
				),
			),
		);
	}

	return labels;
}

/**
 * Who a sync writes about.
 *
 * An address is the minimum — Brevo has nothing to write to without one. The
 * onboarding filter is the admin's choice: half the accounts belong to people
 * who signed up, looked around and never came back, and a sync that carries
 * them along fills the mailing list with contacts nobody will ever mail.
 */
export const syncableUsersWhere = (onlyOnboarded?: boolean) => ({
	email: { not: null },
	...(onlyOnboarded ? { onboardingDone: true } : {}),
});

/** Everything the attribute mapping reads, and nothing else. */
const userSelection = {
	id: true,
	name: true,
	email: true,
	lang: true,
	onboardingDone: true,
	agreements: true,
	profile: { select: { name: true, primaryInterest: true, isActive: true } },
	specialities: {
		// "First speciality" is the one the user filled in first — the same order
		// the profile shows them in.
		orderBy: { createdAt: "asc" },
		select: {
			level: true,
			isOpenForMentoring: true,
			direction: { select: { name: true } },
		},
	},
} satisfies Prisma.UserSelect;

type SyncableUser = {
	id: string;
	name: string | null;
	email: string | null;
	lang: string | null;
	onboardingDone: boolean;
	agreements: unknown;
	profile: {
		name: string | null;
		primaryInterest: string | null;
		isActive: boolean;
	} | null;
	specialities: {
		level: SkillLevel;
		isOpenForMentoring: boolean;
		direction: { name: string };
	}[];
};

/**
 * The two things a person can be available for, spelled the way Brevo's
 * `AVAILABLE_FOR` enumerates them. It is a *multiple-choice* attribute, so a
 * contact holds any subset of these — including none.
 */
export const AVAILABLE_FOR_OFFERS = "offers";
export const AVAILABLE_FOR_ADVISING = "advising";

export type BrevoContactAttributes = {
	FIRSTNAME: string | null;
	MAIN_INTEREST: string | null;
	MAIN_LOCALE: string | null;
	DIRECTIONS: string | null;
	LEVEL: string | null;
	ONBOARDING_DONE: boolean;
	HAS_SUBSCRIBE_TO_NEWSLETTER: boolean;
	AVAILABLE_FOR: string[];
};

/**
 * What the person currently offers, from the two switches that say so:
 * "Available for offers" on the resources page, and mentorship on any of their
 * specialities.
 */
export function buildAvailableFor(user: {
	profile: { isActive: boolean } | null;
	specialities: { isOpenForMentoring: boolean }[];
}): string[] {
	const available: string[] = [];

	if (user.profile?.isActive) available.push(AVAILABLE_FOR_OFFERS);
	if (user.specialities.some((speciality) => speciality.isOpenForMentoring)) {
		available.push(AVAILABLE_FOR_ADVISING);
	}

	return available;
}

/**
 * Maps a user onto the Brevo contact.
 *
 * Empty values are sent as-is rather than skipped: a speciality the user
 * removed has to disappear from Brevo too, and omitting the key would leave the
 * old value standing.
 */
export function buildContactAttributes(
	user: SyncableUser,
): BrevoContactAttributes {
	const agreements = (user.agreements ?? {}) as Record<string, boolean>;
	const [firstSpeciality] = user.specialities;

	return {
		FIRSTNAME: user.profile?.name || user.name,
		MAIN_INTEREST: user.profile?.primaryInterest ?? null,
		// The language the person reads the product in — the one attribute the
		// registration route used to write on its own, which is how it ended up
		// set for whoever signed up and missing for everyone else.
		MAIN_LOCALE: user.lang ?? null,
		// The first speciality only, and its direction alone — the level travels
		// beside it in LEVEL rather than inside the string, so a segment can
		// filter on either without parsing.
		DIRECTIONS: firstSpeciality?.direction.name ?? null,
		LEVEL: firstSpeciality?.level ?? null,
		ONBOARDING_DONE: user.onboardingDone,
		HAS_SUBSCRIBE_TO_NEWSLETTER: agreements.needSubscribeToNewsletter ?? false,
		AVAILABLE_FOR: buildAvailableFor(user),
	};
}

/**
 * The same attributes, encoded the way the *import* endpoint wants them.
 *
 * `POST /contacts/import` and `POST /contacts` do not speak the same dialect: a
 * JSON `true` reaches a single contact intact, but the import parser drops it
 * on the floor — along with `1` and `"true"` — and only stores a boolean when
 * it is spelled `"Yes"` or `"No"`. The request still answers 202, so the field
 * simply never appears.
 *
 * `AVAILABLE_FOR` is a *multiple-choice* attribute and travels as an array in
 * both dialects — the comma-separated string a CSV import would take is dropped
 * here just as silently. An empty array is not a delete: the import leaves the
 * previous choices standing even with `emptyContactsAttributes`, so clearing
 * someone's availability only works through the single-contact endpoint, which
 * is the path every switch below takes anyway.
 *
 * Verified against the account rather than the documentation, which does not
 * mention it.
 */
export function toImportAttributes(
	attributes: BrevoContactAttributes,
): Record<string, string | string[] | null> {
	return Object.fromEntries(
		Object.entries(attributes).map(([key, value]) => [
			key,
			typeof value === "boolean" ? (value ? "Yes" : "No") : value,
		]),
	);
}

/**
 * Creates the free-form attributes the mapping writes, when the account lacks
 * them. Category attributes are left alone — see `CATEGORY_ATTRIBUTES`.
 */
async function ensureAttributes(): Promise<void> {
	const { data } = await brevoApi.contacts.getAttributes();
	const existing = new Set(
		(data.attributes ?? []).map((attribute) => attribute.name.toUpperCase()),
	);

	for (const attribute of PLAIN_ATTRIBUTES) {
		if (existing.has(attribute.name)) continue;

		await brevoApi.contacts.createAttribute("normal", attribute.name, {
			type: attribute.type,
		});
	}
}

/**
 * Which of our category values Brevo would refuse to store.
 *
 * A speciality level or primary interest added to the app but never mirrored
 * into the Brevo enumeration disappears on write without so much as a warning,
 * so the answer is worth surfacing before a sync rather than after.
 */
async function findUnsupportedValues(
	onlyOnboarded?: boolean,
): Promise<UnsupportedValue[]> {
	const labels = await readCategoryLabels();

	const [interests, levels, locales] = await Promise.all([
		prisma.profile.groupBy({
			by: ["primaryInterest"],
			where: { user: syncableUsersWhere(onlyOnboarded) },
			_count: { _all: true },
		}),
		prisma.speciality.groupBy({
			by: ["level"],
			where: { user: syncableUsersWhere(onlyOnboarded) },
			_count: { _all: true },
		}),
		prisma.user.groupBy({
			by: ["lang"],
			where: syncableUsersWhere(onlyOnboarded),
			_count: { _all: true },
		}),
	]);

	const unsupported: UnsupportedValue[] = [];

	const check = (
		attribute: CategoryAttribute,
		rows: { value: string | null; count: number }[],
	) => {
		const accepted = labels.get(attribute);
		// The attribute is missing entirely — `ensureAttributes` cannot create it
		// without an enumeration, so every value would be dropped.
		if (!accepted) {
			for (const row of rows) {
				if (row.value) {
					unsupported.push({
						attribute,
						value: row.value,
						userCount: row.count,
					});
				}
			}
			return;
		}

		for (const row of rows) {
			if (!row.value || accepted.has(row.value.toUpperCase())) continue;
			unsupported.push({ attribute, value: row.value, userCount: row.count });
		}
	};

	check(
		"MAIN_INTEREST",
		interests.map((row) => ({
			value: row.primaryInterest,
			count: row._count._all,
		})),
	);
	check(
		"LEVEL",
		levels.map((row) => ({ value: row.level, count: row._count._all })),
	);
	check(
		"MAIN_LOCALE",
		locales.map((row) => ({ value: row.lang, count: row._count._all })),
	);

	return unsupported;
}

/** Keyed by list: pointing the env at another list must not read a stale set. */
const contactEmailsCacheKey = () =>
	`brevo:list-emails:${brevoSubscribersListId()}`;

/**
 * Brevo has no "do these hundred emails exist" endpoint, so the list is read
 * whole and cached. Five minutes is short enough that a fresh signup shows up
 * while an admin is still looking at the page, and long enough that paging
 * through the table does not re-read the list every time.
 */
const CONTACT_EMAILS_TTL_SECONDS = 300;

/**
 * The target list's id and name.
 *
 * Named in the confirm dialog because the id alone tells an admin nothing, and
 * "Test users" versus "users" is exactly the distinction worth catching before
 * pressing the button.
 */
async function readListInfo(): Promise<{ id: number; name: string }> {
	const id = brevoSubscribersListId();

	try {
		const { data } = await brevoApi.contacts.getList(id);
		return { id, name: data.name };
	} catch (error) {
		console.error("[brevo] could not read the list name", error);
		return { id, name: `#${id}` };
	}
}

/** Pages through the configured list and collects its emails. */
async function readListEmails(): Promise<string[]> {
	const emails: string[] = [];
	// The list endpoint caps out lower than the account-wide one.
	const pageSize = 500;

	for (let offset = 0; ; offset += pageSize) {
		const { data } = await brevoApi.contacts.getContactsFromList(
			brevoSubscribersListId(),
			{ limit: pageSize, offset },
		);

		const contacts = data.contacts ?? [];

		for (const contact of contacts) {
			if (contact.email) emails.push(String(contact.email).toLowerCase());
		}

		if (contacts.length < pageSize) break;
	}

	return emails;
}

/**
 * Every email in the list this app syncs to, lower-cased.
 *
 * Scoped to `BREVO_SUBSCRIBERS_LIST_ID` and not to the whole account, because
 * that is what the sync writes to: a contact sitting in some other list is one
 * this list does not have yet, and calling it present would be a lie the moment
 * the env points somewhere else.
 *
 * Cached because the admin table asks for it on every page render, and because
 * it is the same read the sync preview needs.
 */
export async function getBrevoContactEmails(): Promise<Set<string>> {
	const emails = await cached(
		contactEmailsCacheKey(),
		CONTACT_EMAILS_TTL_SECONDS,
		readListEmails,
	);

	return new Set(emails);
}

/** Drops the cache so a fresh sync is reflected in the table immediately. */
export const invalidateBrevoContactEmails = () =>
	cacheDelete(contactEmailsCacheKey());

/**
 * Erases a contact from Brevo entirely.
 *
 * Called when a user's personal data is deleted, so the address must not
 * survive in the mailing platform — removing it from the list alone would leave
 * it in the account, still reachable by any other list or campaign, which is
 * not what "delete my data" means.
 *
 * Best-effort, like the chat and Matrix cleanups beside it: the platform-side
 * deletion has already happened and cannot be rolled back because an external
 * service was unreachable.
 */
export async function deleteBrevoContact(email: string): Promise<void> {
	try {
		await brevoApi.contacts.deleteContact(email);
		await invalidateBrevoContactEmails();
	} catch (error) {
		// 404 is success in disguise — there was nothing to remove.
		const status = (error as { status?: number })?.status;
		if (status === 404) return;

		console.error("[brevo] failed to delete the contact", error);
	}
}

/**
 * Mirrors one person's availability into Brevo, and nothing else.
 *
 * Called from the two switches that decide it, so a segment built on
 * `AVAILABLE_FOR` is right the moment someone flips one — waiting for the next
 * admin sync would leave the mailing platform offering people who had just
 * said they were not available.
 *
 * Best-effort: the setting is already saved, and a mailing platform that is
 * down must not turn a successful save into an error. It also only ever
 * *updates* — a contact Brevo has never heard of gets its attributes at
 * registration or from the next full sync, and creating one here would add
 * somebody to the mailing list from a settings page.
 */
export async function syncUserAvailabilityToBrevo(
	userId: string,
): Promise<void> {
	if (isDryRunByDefault()) return;

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				email: true,
				profile: { select: { isActive: true } },
				specialities: { select: { isOpenForMentoring: true } },
			},
		});

		if (!user?.email) return;

		await brevoApi.contacts.updateContact(user.email, {
			attributes: { AVAILABLE_FOR: buildAvailableFor(user) },
		});
	} catch (error) {
		// 404 is not a failure — see above, this endpoint does not create.
		const status = (error as { status?: number })?.status;
		if (status === 404) return;

		console.error("[brevo] failed to sync availability", error);
	}
}

export type SyncOptions = {
	/** Build the payload and return it without touching Brevo. */
	dryRun?: boolean;
	/** Leave out everyone who never finished onboarding. */
	onlyOnboarded?: boolean;
};

export type SyncPreview = {
	/** The list contacts land in, so the dialog can name it. */
	list: { id: number; name: string };
	/** Users with an email — everyone the sync would touch. */
	total: number;
	/** Not in Brevo at all: the import creates these contacts. */
	toCreate: number;
	/** Already there: the import only rewrites their attributes. */
	toUpdate: number;
	/** Values Brevo would drop on the floor — empty when everything lines up. */
	unsupportedValues: UnsupportedValue[];
};

/**
 * Counts what a full sync would create versus update.
 *
 * Answers the one question the confirm dialog cannot answer from our side
 * alone — how many people this is about to *add* to the mailing platform, as
 * opposed to quietly correcting.
 *
 * Reads every contact in the account rather than only the target list: a
 * contact that exists but sits in another list is an update, not a new
 * subscriber, and counting it as new would overstate the damage.
 */
export async function previewBrevoSync(
	options: Pick<SyncOptions, "onlyOnboarded"> = {},
): Promise<SyncPreview> {
	const emails = (
		await prisma.user.findMany({
			where: syncableUsersWhere(options.onlyOnboarded),
			select: { email: true },
		})
	)
		.map((user) => user.email?.toLowerCase())
		.filter((email): email is string => Boolean(email));

	const [known, list] = await Promise.all([
		getBrevoContactEmails(),
		readListInfo(),
	]);

	const toCreate = emails.filter((email) => !known.has(email)).length;

	return {
		list,
		total: emails.length,
		toCreate,
		toUpdate: emails.length - toCreate,
		unsupportedValues: await findUnsupportedValues(options.onlyOnboarded),
	};
}

export type SingleSyncResult = {
	userId: string;
	email: string;
	dryRun: boolean;
	attributes: BrevoContactAttributes;
};

/**
 * Pushes one user into Brevo.
 *
 * `updateEnabled` makes this an upsert: an admin syncing someone who never
 * reached the newsletter step should end with a contact, not an error.
 */
export async function syncUserToBrevo(
	userId: string,
	options: SyncOptions = {},
): Promise<SingleSyncResult> {
	const dryRun = options.dryRun ?? isDryRunByDefault();

	const user = (await prisma.user.findUnique({
		where: { id: userId },
		select: userSelection,
	})) as SyncableUser | null;

	if (!user) throw new Error("User not found");
	if (!user.email) throw new Error("User has no email");

	const attributes = buildContactAttributes(user);

	if (!dryRun) {
		await ensureAttributes();

		await brevoApi.contacts.createContact({
			email: user.email,
			listIds: [brevoSubscribersListId()],
			updateEnabled: true,
			attributes,
		});
	}

	// The row's Brevo tick is drawn from the cached list, so a sync that just
	// added this contact has to drop it — otherwise the table keeps claiming the
	// user is absent for up to another five minutes.
	if (!dryRun) await invalidateBrevoContactEmails();

	return { userId: user.id, email: user.email, dryRun, attributes };
}

export type BulkSyncResult = {
	/** Users handed to Brevo — or that would have been, on a dry run. */
	contactCount: number;
	dryRun: boolean;
	/** Brevo processes the import asynchronously; these are its job ids. */
	processIds: number[];
	/** First few payloads, so a dry run can be eyeballed. */
	sample: { email: string; attributes: BrevoContactAttributes }[];
};

/**
 * Pushes every user with an email into Brevo.
 *
 * Uses the import endpoint rather than a loop of contact updates: Brevo runs it
 * as a background job, so the request returns in seconds no matter how many
 * users there are, and the rate limit that would eat a per-contact loop never
 * comes into play. `emptyContactsAttributes` is on — the app is the source of
 * truth, so a value cleared here has to clear there.
 */
export async function syncAllUsersToBrevo(
	options: SyncOptions = {},
): Promise<BulkSyncResult> {
	const dryRun = options.dryRun ?? isDryRunByDefault();

	if (!dryRun) await ensureAttributes();

	// 10MB per import request; 5k users of this shape is well under it, and the
	// chunking keeps a growing user base from ever reaching the ceiling.
	const chunkSize = 5000;
	const processIds: number[] = [];
	const sample: BulkSyncResult["sample"] = [];
	let contactCount = 0;
	let cursor: string | undefined;

	for (;;) {
		const users = (await prisma.user.findMany({
			where: syncableUsersWhere(options.onlyOnboarded),
			select: userSelection,
			orderBy: { id: "asc" },
			take: chunkSize,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
		})) as SyncableUser[];

		if (!users.length) break;

		const contacts = users.map((user) => ({
			email: user.email as string,
			attributes: buildContactAttributes(user),
		}));

		sample.push(...contacts.slice(0, Math.max(0, 5 - sample.length)));

		if (!dryRun) {
			const { data } = await brevoApi.contacts.importContacts(
				{
					listIds: [brevoSubscribersListId()],
					updateExistingContacts: true,
					emptyContactsAttributes: true,
					disableNotification: true,
					jsonBody: contacts.map((contact) => ({
						email: contact.email,
						attributes: toImportAttributes(contact.attributes),
					})),
				},
				// The generated client omits this for `importContacts`, so without it
				// the body is never parsed and `data` comes back null.
				{ format: "json" },
			);

			// The import is accepted either way; the process id is only a handle for
			// checking on it afterwards, so a missing one must not fail the sync.
			if (data?.processId) processIds.push(data.processId);
		}

		contactCount += users.length;
		cursor = users[users.length - 1].id;

		if (users.length < chunkSize) break;
	}

	if (!dryRun) await invalidateBrevoContactEmails();

	return { contactCount, dryRun, processIds, sample };
}
