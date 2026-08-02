/**
 * Fills `SpaceRolePermission` from the space registry in code.
 *
 *   bun run rbac:seed-matrix -- --dry-run   # show what would change
 *   bun run rbac:seed-matrix                # apply
 *   bun run rbac:seed-matrix -- --force     # also overwrite hand-made edits
 *
 * Idempotent by design: run it after every release that adds a feature or an
 * action. Rows edited in the admin UI survive unless `--force` — a checkbox
 * someone unticked on purpose must not come back on the next deploy.
 *
 * The decisions live in `planMatrixSync` (unit-tested); this file only applies
 * them. See docs/roles-and-permissions-plan.md, фаза 2.
 */
import { buildPermissionMatrix } from "@/config/permissions/matrix";
import { spaceList } from "@/config/spaces";
import { planMatrixSync } from "@/services/access/matrix-sync";
import { prisma } from "@/services/prisma";

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	const force = process.argv.includes("--force");

	const desired = buildPermissionMatrix(spaceList());
	const existing = await prisma.spaceRolePermission.findMany();
	const plan = planMatrixSync(desired, existing, { force });

	if (!dryRun) {
		if (plan.create.length > 0) {
			await prisma.spaceRolePermission.createMany({ data: plan.create });
		}

		for (const row of plan.update) {
			await prisma.spaceRolePermission.update({
				where: { id: row.id },
				data: { allowed: row.allowed, scope: row.scope },
			});
		}

		if (plan.remove.length > 0) {
			await prisma.spaceRolePermission.deleteMany({
				where: { id: { in: plan.remove.map((row) => row.id) } },
			});
		}
	}

	const suffix = dryRun ? " (would be)" : "";
	console.info(`\nRBAC matrix${dryRun ? " — dry run" : " seeded"}:`);
	console.info(`  rows in registry : ${desired.length}`);
	console.info(`  created${suffix} : ${plan.create.length}`);
	console.info(`  updated${suffix} : ${plan.update.length}`);
	console.info(`  removed${suffix} : ${plan.remove.length} (stale permissions)`);
	console.info(`  kept hand-edited : ${plan.keepEdited.length}`);

	if (plan.keepEdited.length > 0) {
		console.info("\nHand-edited rows left untouched (use --force to reset):");
		for (const key of plan.keepEdited) console.info(`  ${key}`);
	}

	if (plan.remove.length > 0) {
		console.info("\nStale permissions:");
		for (const row of plan.remove) console.info(`  ${row.key}`);
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
