/**
 * Backfill ChatRoom registry rows for legacy advice-request chats.
 *
 * Before the Stage 1 migration, advice chats stored their Matrix room only in
 * AdviceRequest.matrixRoomId and had no ChatRoom row, so the registry (context
 * resolution, drawer grouping) doesn't know them. This script creates one
 * ChatRoom per AdviceRequest with a matrixRoomId:
 *   - kind:      AdviceRequest
 *   - directKey: advice:{adviceRequestId}
 *   - status:    Open, or Closed (+finishedAt) when the request is
 *                Closed/Rejected/Executed
 *   - context:   { adviceRequestId, fromUserId, toUserId }
 *
 * Usage:
 *   node -r dotenv/config scripts/backfill-advice-chatrooms.mjs [--dry-run]
 *
 * Required env: DATABASE_URL (platform DB). Idempotent — rooms already in the
 * registry (by directKey or matrixRoomId) are skipped.
 */

import "dotenv/config";
import { GdhubDatabaseService } from "@gdhub-io/gdhub-prisma";

const DRY_RUN = process.argv.includes("--dry-run");
const OPEN_STATUSES = new Set(["Created", "Approved"]);

const prisma = GdhubDatabaseService.init().client;

try {
	const adviceRequests = await prisma.adviceRequest.findMany({
		where: { matrixRoomId: { not: null } },
		select: {
			id: true,
			matrixRoomId: true,
			status: true,
			finishedAt: true,
			fromUserId: true,
			toUserId: true,
			project: { select: { name: true } },
		},
	});
	console.log(
		`Advice requests with a Matrix room: ${adviceRequests.length}${DRY_RUN ? " (dry run)" : ""}`,
	);

	let created = 0;
	let skipped = 0;
	let failures = 0;

	for (const ar of adviceRequests) {
		const directKey = `advice:${ar.id}`;
		try {
			const existing = await prisma.chatRoom.findFirst({
				where: {
					OR: [{ directKey }, { matrixRoomId: ar.matrixRoomId }],
				},
				select: { id: true },
			});
			if (existing) {
				skipped++;
				continue;
			}

			const isOpen = OPEN_STATUSES.has(ar.status);
			if (!DRY_RUN) {
				await prisma.chatRoom.create({
					data: {
						kind: "AdviceRequest",
						status: isOpen ? "Open" : "Closed",
						directKey,
						matrixRoomId: ar.matrixRoomId,
						isDirect: true,
						title: ar.project?.name || null,
						finishedAt: isOpen ? null : (ar.finishedAt ?? new Date()),
						context: {
							adviceRequestId: ar.id,
							fromUserId: ar.fromUserId,
							toUserId: ar.toUserId,
						},
					},
				});
			}
			created++;
			console.log(
				`  ${DRY_RUN ? "[dry] " : ""}${directKey} -> ${ar.matrixRoomId} (${isOpen ? "Open" : "Closed"})`,
			);
		} catch (e) {
			failures++;
			console.error(`  ✗ ${directKey}: ${e.message}`);
		}
	}

	console.log(
		`Done. created: ${created}, already in registry: ${skipped}, failures: ${failures}`,
	);
	process.exitCode = failures ? 1 : 0;
} finally {
	await prisma.$disconnect().catch(() => {});
}
