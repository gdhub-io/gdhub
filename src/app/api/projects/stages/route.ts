import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async () => {
	const projects = await prisma.project.getProjectsOrderedByActivity({
		order: "desc",
	});

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

	const result = Array.from(uniqueStages.values())
		.sort((left, right) => left.order - right.order)
		.map(({ label, value }) => ({ label, value }));

	return json(result);
});
