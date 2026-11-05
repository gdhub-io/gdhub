/**
 * Puts every existing user into the Announcements channel and protects every
 * Matrix avatar from the yearly media purge (GDHUB-155).
 *
 *   bun run chat:announcements-backfill -- --dry-run   # report only
 *   bun run chat:announcements-backfill                # apply
 *
 * Idempotent: a joined user is joined again for free, a protected avatar stays
 * protected. New users need nothing — the chat session route joins them.
 */
import { env } from "@/helpers/env";
import {
	ensureAnnouncementsRoom,
	ensureGdhubAccount,
	joinAnnouncements,
} from "@/services/chat/announcements";
import { protectMatrixMedia } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";
import { announceDbTarget } from "./_db-target";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 5;

async function avatarOf(matrixUserId: string): Promise<string | null> {
	const resp = await fetch(
		`${env("MATRIX_CHAT_BASE_URL")}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`,
		{
			headers: {
				Authorization: `Bearer ${env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN")}`,
			},
		},
	);
	if (!resp.ok) return null;
	const { avatar_url } = (await resp.json()) as { avatar_url?: string };
	return avatar_url?.startsWith("mxc://") ? avatar_url : null;
}

async function main() {
	announceDbTarget(DRY_RUN ? "Dry run: announcements backfill" : "Announcements backfill");

	const users = await prisma.user.findMany({
		where: { matrixUserId: { not: null } },
		select: { id: true, matrixUserId: true },
		orderBy: { createdAt: "asc" },
	});
	console.log(`${users.length} users with a Matrix account`);
	if (DRY_RUN) return;

	console.log(`Announcements room: ${await ensureAnnouncementsRoom()}`);
	// Re-uploads the brand mark, so an account created earlier gets the current one.
	await ensureGdhubAccount();

	let joined = 0;
	let protectedAvatars = 0;
	const failed: string[] = [];

	for (let i = 0; i < users.length; i += BATCH) {
		await Promise.all(
			users.slice(i, i + BATCH).map(async (user) => {
				try {
					await joinAnnouncements(user.id);
					joined++;
					const avatar = await avatarOf(user.matrixUserId as string);
					if (avatar) {
						await protectMatrixMedia(avatar);
						protectedAvatars++;
					}
				} catch (error) {
					failed.push(user.id);
					console.error(`  ${user.id}:`, error);
				}
			}),
		);
		console.log(`  ${Math.min(i + BATCH, users.length)} / ${users.length}`);
	}

	console.log(
		`Done: ${joined} joined, ${protectedAvatars} avatars protected, ${failed.length} failed`,
	);
	if (failed.length) console.log(`Failed: ${failed.join(", ")}`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
		// The Redis token cache keeps the event loop alive otherwise.
		process.exit();
	});
