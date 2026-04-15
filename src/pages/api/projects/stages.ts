import { createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiProjectStagesHandler {
	@Get()
	public async list() {
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

		return Array.from(uniqueStages.values())
			.sort((left, right) => left.order - right.order)
			.map(({ label, value }) => ({ label, value }));
	}
}

export default createHandler(ApiProjectStagesHandler);
