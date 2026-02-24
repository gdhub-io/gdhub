import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import {
	ADVISOR_ROLE_COEF,
	ADVISOR_SESSION_TO_DAY_EQUIVALENT,
	ADVISOR_WEEKLY_SESSION_CAP,
	CORE_ROLE_COEF,
	getActiveDays,
	getAdvisorOutcomeCoef,
	getEntryStageCoef,
	getOutcomeCoef,
	LEADERSHIP_FINISH_BONUS_WEIGHT,
	LEADERSHIP_ROLE_COEF,
	STAGE_DEPTH_BONUS_WEIGHT,
} from "@/lib/skill-capital";
import { prisma } from "@/services/prisma";

type SkillCapitalProjectItem = {
	id: string;
	name: string;
	status: prismaClient.ProjectStatus;
	currentStepName?: string | null;
	roles: string[];
	leadershipCapital: number;
	executionCapital: number;
	mentorshipCapital: number;
	totalCapital: number;
};

type SkillCapitalResponse = {
	scTotal: number;
	leadershipCapital: number;
	executionCapital: number;
	mentorshipCapital: number;
	investorCapital: number | null;
	projects: {
		active: SkillCapitalProjectItem[];
		history: SkillCapitalProjectItem[];
	};
};

type CapitalProjectAccumulator = {
	id: string;
	name: string;
	status: prismaClient.ProjectStatus;
	currentStepName?: string | null;
	roles: Set<string>;
	stepsCount: number;
	leadershipCapital: number;
	executionCapital: number;
	mentorshipCapital: number;
};

const ensureProjectAccumulator = ({
	store,
	project,
	role,
}: {
	store: Map<string, CapitalProjectAccumulator>;
	project: {
		id: string;
		name: string;
		status: prismaClient.ProjectStatus;
		workflow?: {
			currentStep?: { name?: string | null } | null;
			steps?: { id: string }[];
		} | null;
	};
	role?: string;
}) => {
	const existing = store.get(project.id);
	if (existing) {
		if (role) existing.roles.add(role);
		return existing;
	}

	const created: CapitalProjectAccumulator = {
		id: project.id,
		name: project.name,
		status: project.status,
		currentStepName: project.workflow?.currentStep?.name,
		roles: new Set(role ? [role] : []),
		stepsCount: project.workflow?.steps?.length ?? 0,
		leadershipCapital: 0,
		executionCapital: 0,
		mentorshipCapital: 0,
	};
	store.set(project.id, created);
	return created;
};

@NextAuthGuard("user")
class SkillCapitalHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
	): Promise<SkillCapitalResponse> {
		const [teamMembers, authoredProjects, completedAdviceRequests] =
			await Promise.all([
				prisma.teamMember.findMany({
					where: { userId: req.user.id },
					include: {
						enteredProjectStep: {
							select: { id: true, name: true, order: true },
						},
						leftProjectStep: { select: { id: true, name: true, order: true } },
						team: {
							select: {
								project: {
									select: {
										id: true,
										name: true,
										status: true,
										authorId: true,
										startedAt: true,
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
												steps: {
													select: { id: true, name: true, order: true },
												},
											},
										},
									},
								},
							},
						},
					},
				}),
				prisma.project.findMany({
					where: { authorId: req.user.id },
					select: {
						id: true,
						name: true,
						status: true,
						authorId: true,
						startedAt: true,
						finishedAt: true,
						dormantAt: true,
						statusChangedAt: true,
						archivedAt: true,
						killedWithDignityAt: true,
						workflow: {
							select: {
								currentStep: { select: { id: true, name: true, order: true } },
								steps: { select: { id: true, name: true, order: true } },
							},
						},
					},
				}),
				prisma.adviceRequest.findMany({
					where: {
						toUserId: req.user.id,
						status: {
							in: [
								prismaClient.AdviceRequestStatus.Closed,
								prismaClient.AdviceRequestStatus.Executed,
							],
						},
						projectId: { not: null },
						finishedAt: { not: null },
					},
					orderBy: { finishedAt: "asc" },
					select: {
						id: true,
						projectId: true,
						createdAt: true,
						finishedAt: true,
						project: {
							select: {
								id: true,
								name: true,
								status: true,
								authorId: true,
								startedAt: true,
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
										steps: { select: { id: true, name: true, order: true } },
									},
								},
							},
						},
					},
				}),
			]);

		const projectsById = new Map<string, CapitalProjectAccumulator>();
		const stageTouched = new Set<string>();

		let leadershipCapitalRaw = 0;
		for (const project of authoredProjects) {
			const accumulator = ensureProjectAccumulator({
				store: projectsById,
				project,
				role: "Author",
			});

			const firstWorkflowStep = project.workflow?.steps
				?.slice()
				.sort((a, b) => {
					const aOrder = a.order ?? 0;
					const bOrder = b.order ?? 0;
					return aOrder - bOrder;
				})[0];
			const entryCoef = getEntryStageCoef(
				firstWorkflowStep ?? project.workflow?.currentStep,
				project.workflow?.steps?.length ?? 0,
			);
			const activeDays = getActiveDays({
				startedAt: project.startedAt,
				finishedAt: project.finishedAt,
				status: project.status,
				dormantAt: project.dormantAt,
				statusChangedAt: project.statusChangedAt,
				archivedAt: project.archivedAt,
				killedWithDignityAt: project.killedWithDignityAt,
				projectFinishedAt: project.finishedAt,
			});
			const projectLeadershipCapital =
				activeDays *
				entryCoef *
				LEADERSHIP_ROLE_COEF *
				getOutcomeCoef(project.status);
			leadershipCapitalRaw += projectLeadershipCapital;
			accumulator.leadershipCapital += projectLeadershipCapital;
		}

		for (const member of teamMembers) {
			const project = member.team?.project;
			if (!project) continue;

			if (project.authorId === req.user.id) {
				const authorProject = ensureProjectAccumulator({
					store: projectsById,
					project,
					role: "Author",
				});
				authorProject.roles.add("Team");
				continue;
			}

			const accumulator = ensureProjectAccumulator({
				store: projectsById,
				project,
				role: "Team",
			});

			const stepsCount = project.workflow?.steps?.length ?? 0;
			const entryCoef = getEntryStageCoef(
				member.enteredProjectStep ?? project.workflow?.currentStep,
				stepsCount,
			);
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

			const projectExecutionCapital =
				activeDays *
				entryCoef *
				CORE_ROLE_COEF *
				getOutcomeCoef(project.status);
			accumulator.executionCapital += projectExecutionCapital;

			if (member.enteredProjectStep?.id)
				stageTouched.add(member.enteredProjectStep.id);
			if (member.leftProjectStep?.id)
				stageTouched.add(member.leftProjectStep.id);
			if (project.workflow?.currentStep?.id)
				stageTouched.add(project.workflow.currentStep.id);
		}

		const acceptedSessionsByProject = new Map<string, number>();
		const acceptedSessionsByProjectWeek = new Map<string, number>();

		for (const adviceRequest of completedAdviceRequests) {
			const project = adviceRequest.project;
			if (!project || !adviceRequest.projectId) continue;

			const weekKey = dayjs(adviceRequest.finishedAt ?? adviceRequest.createdAt)
				.startOf("week")
				.toISOString();
			const projectWeekKey = `${adviceRequest.projectId}:${weekKey}`;
			const weekCount = acceptedSessionsByProjectWeek.get(projectWeekKey) ?? 0;
			if (weekCount >= ADVISOR_WEEKLY_SESSION_CAP) continue;

			acceptedSessionsByProjectWeek.set(projectWeekKey, weekCount + 1);
			acceptedSessionsByProject.set(
				adviceRequest.projectId,
				(acceptedSessionsByProject.get(adviceRequest.projectId) ?? 0) + 1,
			);

			const accumulator = ensureProjectAccumulator({
				store: projectsById,
				project,
				role: "Mentor",
			});
			if (project.authorId === req.user.id) accumulator.roles.add("Author");
		}

		for (const [
			projectId,
			acceptedSessions,
		] of acceptedSessionsByProject.entries()) {
			const projectAccumulator = projectsById.get(projectId);
			if (!projectAccumulator) continue;

			const advisorDayEquivalent =
				acceptedSessions * ADVISOR_SESSION_TO_DAY_EQUIVALENT;
			const projectMentorshipCapital =
				advisorDayEquivalent *
				ADVISOR_ROLE_COEF *
				getAdvisorOutcomeCoef(projectAccumulator.status);
			projectAccumulator.mentorshipCapital += projectMentorshipCapital;
		}

		const releasedAsAuthor = authoredProjects.filter(
			(project) => project.status === prismaClient.ProjectStatus.Released,
		).length;
		const startedAsAuthor = authoredProjects.length;
		const killedWithDignityAsAuthor = authoredProjects.filter(
			(project) =>
				project.status === prismaClient.ProjectStatus.KilledWithDignity,
		).length;
		const riAuthorDenominator = Math.max(
			startedAsAuthor - killedWithDignityAsAuthor,
			0,
		);
		const riAuthor =
			riAuthorDenominator > 0 ? releasedAsAuthor / riAuthorDenominator : 0;
		const leadershipFinishBonus = riAuthor * LEADERSHIP_FINISH_BONUS_WEIGHT;

		const executionCapitalRaw = Array.from(projectsById.values()).reduce(
			(sum, project) => sum + project.executionCapital,
			0,
		);
		const maxCoreSteps = Array.from(projectsById.values()).reduce(
			(max, project) =>
				project.executionCapital > 0 && project.stepsCount > max
					? project.stepsCount
					: max,
			0,
		);
		const stageDepthScore =
			maxCoreSteps > 0 ? stageTouched.size / maxCoreSteps : 0;
		const stageDepthBonus = stageDepthScore * STAGE_DEPTH_BONUS_WEIGHT;

		const leadershipCapital = leadershipCapitalRaw + leadershipFinishBonus;
		const executionCapital = executionCapitalRaw + stageDepthBonus;
		const mentorshipCapital = Array.from(projectsById.values()).reduce(
			(sum, project) => sum + project.mentorshipCapital,
			0,
		);
		const scTotal = leadershipCapital + executionCapital + mentorshipCapital;

		const active: SkillCapitalProjectItem[] = [];
		const history: SkillCapitalProjectItem[] = [];

		for (const project of projectsById.values()) {
			const item: SkillCapitalProjectItem = {
				id: project.id,
				name: project.name,
				status: project.status,
				currentStepName: project.currentStepName,
				roles: Array.from(project.roles.values()),
				leadershipCapital: Math.round(project.leadershipCapital),
				executionCapital: Math.round(project.executionCapital),
				mentorshipCapital: Math.round(project.mentorshipCapital),
				totalCapital: Math.round(
					project.leadershipCapital +
						project.executionCapital +
						project.mentorshipCapital,
				),
			};

			if (project.status === prismaClient.ProjectStatus.Approved) {
				active.push(item);
			} else {
				history.push(item);
			}
		}

		return {
			scTotal: Math.round(scTotal),
			leadershipCapital: Math.round(leadershipCapital),
			executionCapital: Math.round(executionCapital),
			mentorshipCapital: Math.round(mentorshipCapital),
			investorCapital: null,
			projects: { active, history },
		};
	}
}

export default createHandler(SkillCapitalHandler);
