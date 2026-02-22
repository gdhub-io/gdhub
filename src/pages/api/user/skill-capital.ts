import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import {
	getActiveDays,
	getEntryStageCoef,
	getOutcomeCoef,
	SC_RI_WEIGHT,
	smoothPcs,
} from "@/lib/skill-capital";
import { prisma } from "@/services/prisma";

type SkillCapitalProjectItem = {
	id: string;
	name: string;
	status: prismaClient.ProjectStatus;
	currentStepName?: string | null;
	roles: string[];
	pcs: number;
};

type SkillCapitalResponse = {
	sc: number;
	pcsTotal: number;
	ri: number;
	sds: { value: number; total: number };
	projects: {
		active: SkillCapitalProjectItem[];
		history: SkillCapitalProjectItem[];
	};
};

@NextAuthGuard("user")
class SkillCapitalHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
	): Promise<SkillCapitalResponse> {
		const teamMembers = await prisma.teamMember.findMany({
			where: { userId: req.user.id },
			include: {
				enteredProjectStep: { select: { id: true, name: true, order: true } },
				leftProjectStep: { select: { id: true, name: true, order: true } },
				team: {
					select: {
						project: {
							select: {
								id: true,
								name: true,
								status: true,
								authorId: true,
								finishedAt: true,
								dormantAt: true,
								statusChangedAt: true,
								archivedAt: true,
								killedWithDignityAt: true,
								workflow: {
									select: {
										currentStep: {
											select: { id: true, name: true, order: true },
										},
										steps: { select: { id: true, order: true } },
									},
								},
							},
						},
					},
				},
			},
		});
		const adviceRequests = await prisma.adviceRequest.findMany({
			where: {
				toUserId: req.user.id,
				status: prismaClient.AdviceRequestStatus.Approved,
				projectId: { not: null },
			},
			select: {
				projectId: true,
				createdAt: true,
				finishedAt: true,
				project: {
					select: {
						id: true,
						name: true,
						status: true,
						authorId: true,
						finishedAt: true,
						dormantAt: true,
						statusChangedAt: true,
						archivedAt: true,
						killedWithDignityAt: true,
						workflow: {
							select: {
								currentStep: { select: { id: true, name: true, order: true } },
								steps: { select: { id: true, order: true } },
							},
						},
					},
				},
			},
		});

		const projectsById = new Map<
			string,
			SkillCapitalProjectItem & { stepsCount: number; rawPcs: number }
		>();
		const stageTouched = new Set<string>();

		for (const member of teamMembers) {
			const project = member.team?.project;
			if (!project) continue;

			const stepsCount = project.workflow?.steps?.length ?? 0;
			const entryStep =
				member.enteredProjectStep ?? project.workflow?.currentStep;
			const entryCoef = getEntryStageCoef(entryStep, stepsCount);
			const outcomeCoef = getOutcomeCoef(project.status);
			const activeDays = getActiveDays({
				startedAt: member.startedAt,
				finishedAt: member.finishedAt,
				status: project.status,
				dormantAt: project.dormantAt,
				statusChangedAt: project.statusChangedAt,
				archivedAt: project.archivedAt,
				killedWithDignityAt: project.killedWithDignityAt,
				projectFinishedAt: project.finishedAt,
			});
			const pcs = activeDays * entryCoef * outcomeCoef;

			const existing = projectsById.get(project.id);
			if (!existing) {
				const roles = project.authorId === req.user.id ? ["Author"] : [];
				projectsById.set(project.id, {
					id: project.id,
					name: project.name,
					status: project.status,
					currentStepName: project.workflow?.currentStep?.name,
					pcs: 0,
					stepsCount,
					rawPcs: pcs,
					roles: [...roles, "Team"],
				});
			} else {
				existing.rawPcs += pcs;
				if (
					project.authorId === req.user.id &&
					!existing.roles.includes("Author")
				) {
					existing.roles.push("Author");
				}
				if (!existing.roles.includes("Team")) {
					existing.roles.push("Team");
				}
			}

			if (member.enteredProjectStep?.id)
				stageTouched.add(member.enteredProjectStep.id);
			if (member.leftProjectStep?.id)
				stageTouched.add(member.leftProjectStep.id);
			if (project.workflow?.currentStep?.id)
				stageTouched.add(project.workflow.currentStep.id);
		}

		for (const adviceRequest of adviceRequests) {
			const project = adviceRequest.project;
			if (!project) continue;

			const stepsCount = project.workflow?.steps?.length ?? 0;
			const entryCoef = getEntryStageCoef(
				project.workflow?.currentStep,
				stepsCount,
			);
			const outcomeCoef = getOutcomeCoef(project.status);
			const activeDays = getActiveDays({
				startedAt: adviceRequest.createdAt,
				finishedAt: adviceRequest.finishedAt,
				status: project.status,
				dormantAt: project.dormantAt,
				statusChangedAt: project.statusChangedAt,
				archivedAt: project.archivedAt,
				killedWithDignityAt: project.killedWithDignityAt,
				projectFinishedAt: project.finishedAt,
			});
			const pcs = activeDays * entryCoef * outcomeCoef;

			const existing = projectsById.get(project.id);
			if (!existing) {
				const roles = project.authorId === req.user.id ? ["Author"] : [];
				projectsById.set(project.id, {
					id: project.id,
					name: project.name,
					status: project.status,
					currentStepName: project.workflow?.currentStep?.name,
					pcs: 0,
					stepsCount,
					rawPcs: pcs,
					roles: [...roles, "Mentor"],
				});
			} else {
				if (!existing.roles.includes("Mentor")) {
					existing.roles.push("Mentor");
				}
				if (
					project.authorId === req.user.id &&
					!existing.roles.includes("Author")
				) {
					existing.roles.push("Author");
				}
				if (!existing.roles.includes("Team")) {
					existing.rawPcs += pcs;
				}
			}

			if (project.workflow?.currentStep?.id)
				stageTouched.add(project.workflow.currentStep.id);
		}

		let pcsTotal = 0;
		const projects = Array.from(projectsById.values()).map((project) => {
			const pcs = smoothPcs(project.rawPcs);
			pcsTotal += pcs;

			return {
				...project,
				pcs,
			};
		});
		const startedProjects = projects.length;
		const completedProjects = projects.filter(
			(p) => p.status === prismaClient.ProjectStatus.Released,
		).length;
		const killedWithDignityProjects = projects.filter(
			(p) => p.status === prismaClient.ProjectStatus.KilledWithDignity,
		).length;
		const riDenominator = Math.max(
			startedProjects - killedWithDignityProjects,
			0,
		);
		const ri = riDenominator > 0 ? completedProjects / riDenominator : 0;

		const maxSteps = projects.reduce(
			(max, project) => (project.stepsCount > max ? project.stepsCount : max),
			0,
		);
		const sdsValue = stageTouched.size;
		const sdsTotal = maxSteps > 0 ? maxSteps : sdsValue;
		const sc = Math.round(pcsTotal + ri * SC_RI_WEIGHT);

		const active: SkillCapitalProjectItem[] = [];
		const history: SkillCapitalProjectItem[] = [];

		for (const project of projects) {
			const item = {
				id: project.id,
				name: project.name,
				status: project.status,
				currentStepName: project.currentStepName,
				pcs: project.pcs,
				roles: project.roles,
			};

			if (project.status === prismaClient.ProjectStatus.Approved) {
				active.push(item);
			} else {
				history.push(item);
			}
		}

		return {
			sc,
			pcsTotal: Math.round(pcsTotal),
			ri: Number(ri.toFixed(2)),
			sds: { value: sdsValue, total: sdsTotal },
			projects: { active, history },
		};
	}
}

export default createHandler(SkillCapitalHandler);
