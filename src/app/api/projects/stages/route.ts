import { json, withAuth } from "@/lib/api-handlers";
import { cached } from "@/services/cache";
import { prisma } from "@/services/prisma";
import type { ProjectActivityRow } from "@/types/project";

// Distinct stage names for a filter: they barely change, and finding them means
// ranking every project.
export const GET = withAuth({ mode: "user" })(async () =>
	json(await cached("projects:stages", 600, loadStages)),
);

async function loadStages() {
	const projects = (await prisma.project.getProjectsOrderedByActivity({
		order: "desc",
	})) as ProjectActivityRow[];

	const uniqueStages = new Map<
		string,
		{ label: string; value: string; order: number }
	>();

	for (const project of projects) {
		const currentStep = project.workflow?.currentStep;

		if (!currentStep?.name) {
			continue;
		}

		if (!uniqueStages.has(currentStep.name)) {
			uniqueStages.set(currentStep.name, {
				label: currentStep.name,
				value: currentStep.name,
				order: currentStep.order ?? Number.MAX_SAFE_INTEGER,
			});
		}
	}

	return Array.from(uniqueStages.values())
		.sort((left, right) => left.order - right.order)
		.map(({ label, value }) => ({ label, value }));
}
