import {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
	PrimaryInterest,
	type Prisma,
	ProjectStatus,
	type SkillLevel,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import { CHECKPOINT_ENTRY_ITEMS_MAX } from "@/config/checkpoint";
import { checkpointPurchaseOpen } from "@/config/checkpoint-pricing";
import { CHECKPOINT_OPEN_STATUSES } from "@/lib/checkpoints/status";
import { createCheckpointItems } from "@/repositories/checkpoints/checkpoint";
import { toArtifactRef } from "@/repositories/checkpoints/detail";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { ensureCheckpointStage } from "@/repositories/project/workflow";
import { prisma } from "@/services/prisma";
import type {
	CheckpointArtifactRef,
	EntryItemDto,
	EntryProjectInput,
	EntryProjectPrefillDto,
	EntryStatusDto,
} from "@/types/checkpoints";
import { latestAcceptance, needsAcceptance } from "../legal/legal";

/**
 * The checkpoint entry hub (`/checkpoint/new`): who the author is, which project
 * they head for a checkpoint with, and what that project already has.
 *
 * "What's done so far" is stored as the `Input` items of the project's draft
 * checkpoint, so the wizard that follows opens on the same lines.
 */

/** A project whose author may still head for a checkpoint with it. */
const LISTED_PROJECT_STATUSES = {
	notIn: [
		ProjectStatus.Archived,
		ProjectStatus.Rejected,
		ProjectStatus.KilledWithDignity,
	],
};

const PROJECTS_LIMIT = 50;

const artifactRefSelect = {
	id: true,
	name: true,
	type: true,
	link: true,
	checkStatus: true,
} as const;

type ItemRow = {
	kind: CheckpointItemKind;
	text: string;
	cut: boolean;
	evidence: { artifact: CheckpointArtifactRef }[];
};

/** What the project has, one line each; a line names the first artifact that shows it. */
const toEntryItem = (
	item: Pick<ItemRow, "text" | "evidence">,
): EntryItemDto => {
	const first = item.evidence[0]?.artifact;
	return { text: item.text, artifact: first ? toArtifactRef(first) : null };
};

/** Money that reached us for a checkpoint, whatever happened to it afterwards. */
const PAID_STATUSES = [
	PaymentStatus.PROCESSING,
	PaymentStatus.COMPLETED,
	PaymentStatus.REFUNDED,
	PaymentStatus.PARTIALLY_REFUNDED,
	PaymentStatus.DISPUTED,
];

/** Founder of the project's team — the one who buys its checkpoints. */
export const isProjectFounder = async (userId: string, projectId: string) =>
	(await prisma.teamMember.count({
		where: {
			userId,
			status: TeamMemberStatus.Founder,
			team: { projectId },
		},
	})) > 0;

/**
 * What a closed checkpoint hands the next one: its delivered outcomes first —
 * not cut, proven by an artifact the backend could open — then its own inputs.
 * A missed outcome is not something the project has, so it is left behind.
 */
export const carryOverItems = (items: ItemRow[]): EntryItemDto[] =>
	[
		...items.filter(
			(item) =>
				item.kind === CheckpointItemKind.Outcome &&
				!item.cut &&
				item.evidence.some(
					({ artifact }) =>
						artifact.checkStatus === ArtifactCheckStatus.Readable,
				),
		),
		...items.filter((item) => item.kind === CheckpointItemKind.Input),
	]
		.slice(0, CHECKPOINT_ENTRY_ITEMS_MAX)
		.map(toEntryItem);

const draftInputsSelect = {
	id: true,
	projectId: true,
	items: {
		where: { kind: CheckpointItemKind.Input },
		orderBy: { order: "asc" },
		select: {
			text: true,
			evidence: {
				orderBy: { createdAt: "asc" },
				select: { artifact: { select: artifactRefSelect } },
			},
		},
	},
} as const;

/** Whether the user ever paid for a checkpoint that left Draft. */
const hasPaidCheckpoint = async (userId: string) => {
	const payments = await prisma.payment.findMany({
		where: {
			payerId: userId,
			payableType: PayableType.CHECKPOINT,
			status: { in: PAID_STATUSES },
		},
		select: { payableId: true },
	});
	if (!payments.length) return false;

	return (
		(await prisma.projectCheckpoint.count({
			where: {
				id: { in: payments.map((payment) => payment.payableId) },
				status: { not: CheckpointStatus.Draft },
			},
		})) > 0
	);
};

/** The newest checkpoint on its way over the projects the user founded. */
const currentCheckpoint = async (
	userId: string,
): Promise<EntryStatusDto["current"]> => {
	const row = await prisma.projectCheckpoint.findFirst({
		where: {
			status: { in: CHECKPOINT_OPEN_STATUSES },
			project: {
				team: {
					members: { some: { userId, status: TeamMemberStatus.Founder } },
				},
			},
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			status: true,
			projectId: true,
			createdAt: true,
			project: { select: { slug: true, name: true } },
		},
	});
	if (!row) return null;

	return {
		id: row.id,
		number: await checkpointNumber(row),
		projectSlug: row.project.slug,
		projectName: row.project.name,
		status: row.status as NonNullable<EntryStatusDto["current"]>["status"],
	};
};

export const getEntryStatus = async (
	userId: string,
): Promise<EntryStatusDto> => {
	const [terms, profile, specialities, projects, hadCheckpoint, current] =
		await Promise.all([
			latestAcceptance(userId, "TermsOfUse"),
			prisma.profile.findUnique({
				where: { userId },
				select: { name: true },
			}),
			prisma.speciality.count({ where: { userId } }),
			prisma.project.findMany({
				where: {
					status: LISTED_PROJECT_STATUSES,
					team: {
						members: { some: { userId, status: TeamMemberStatus.Founder } },
					},
				},
				orderBy: { updatedAt: "desc" },
				take: PROJECTS_LIMIT,
				select: {
					id: true,
					slug: true,
					name: true,
					coverImage: true,
					workflow: { select: { currentStep: { select: { name: true } } } },
					checkpoints: {
						where: { status: { in: CHECKPOINT_OPEN_STATUSES } },
						select: { id: true },
						take: 1,
					},
				},
			}),
			hasPaidCheckpoint(userId),
			currentCheckpoint(userId),
		]);

	// Item 2 is saved with at least one line, so a draft without any is one the
	// wizard opened on its own and not what the hub is asking about. A project
	// with a checkpoint on its way needs no draft: the hub shows it as such.
	const draftProjectIds = projects
		.filter((project) => !project.checkpoints.length)
		.map((project) => project.id);
	const draft = draftProjectIds.length
		? await prisma.projectCheckpoint.findFirst({
				where: {
					projectId: { in: draftProjectIds },
					status: CheckpointStatus.Draft,
					items: { some: { kind: CheckpointItemKind.Input } },
				},
				orderBy: { updatedAt: "desc" },
				select: draftInputsSelect,
			})
		: null;

	return {
		aboutDone: Boolean(profile?.name.trim()) && specialities > 0,
		hadCheckpoint,
		purchaseOpen: checkpointPurchaseOpen(),
		termsAccepted: !needsAcceptance("TermsOfUse", terms?.version),
		current,
		projects: projects.map((project) => ({
			id: project.id,
			slug: project.slug,
			name: project.name,
			cover: project.coverImage,
			stage: project.workflow?.currentStep?.name ?? null,
			running: project.checkpoints.length > 0,
		})),
		draft: draft
			? {
					id: draft.id,
					projectId: draft.projectId,
					items: draft.items.map(toEntryItem),
				}
			: null,
	};
};

export const getEntryPrefill = async (
	projectId: string,
): Promise<EntryProjectPrefillDto> => {
	const draft = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: CheckpointStatus.Draft },
		orderBy: { createdAt: "desc" },
		select: draftInputsSelect,
	});
	if (draft?.items.length) {
		return { items: draft.items.map(toEntryItem), carriedFrom: null };
	}

	const previous = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: CheckpointStatus.Closed },
		orderBy: { decidedAt: "desc" },
		select: {
			projectId: true,
			createdAt: true,
			items: {
				where: {
					kind: { in: [CheckpointItemKind.Outcome, CheckpointItemKind.Input] },
				},
				orderBy: { order: "asc" },
				select: {
					kind: true,
					text: true,
					cut: true,
					evidence: {
						orderBy: { createdAt: "asc" },
						select: { artifact: { select: artifactRefSelect } },
					},
				},
			},
		},
	});
	if (!previous) return { items: [], carriedFrom: null };

	return {
		items: carryOverItems(previous.items),
		carriedFrom: await checkpointNumber(previous),
	};
};

/** Artifact ids among `ids` that are not the project's own. */
export const foreignArtifactIds = async (projectId: string, ids: string[]) => {
	const unique = [...new Set(ids)];
	if (!unique.length) return [];

	const own = await prisma.projectArtifact.findMany({
		where: { id: { in: unique }, projectId },
		select: { id: true },
	});
	const ownIds = new Set(own.map((artifact) => artifact.id));

	return unique.filter((id) => !ownIds.has(id));
};

/**
 * Writes item 2: the project's draft — reused, or opened now — carries exactly
 * these lines as its inputs. A reused draft follows the project's stage, which
 * may just have moved off Introduction.
 *
 * Under a per-project advisory lock: two saves racing (a double click, two tabs)
 * would otherwise both find no draft and open two.
 */
export const saveEntryProject = async ({
	projectId,
	items,
}: EntryProjectInput) => {
	const stage = await ensureCheckpointStage(projectId);

	return prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkpoint-draft:${projectId}`}))`;

		const existing = await tx.projectCheckpoint.findFirst({
			where: { projectId, status: CheckpointStatus.Draft },
			orderBy: { createdAt: "desc" },
			select: { id: true },
		});

		let draftId: string;
		if (existing) {
			await tx.projectCheckpoint.update({
				where: { id: existing.id },
				// `updatedAt` too: the hub offers back the draft saved last.
				data: {
					...(stage ? { stepId: stage.id, stageName: stage.name } : null),
					updatedAt: new Date(),
				},
			});
			draftId = existing.id;
		} else {
			if (!stage) throw new Error("Project is not on a workflow stage");
			// Counted under the lock, so two saves cannot take the same number.
			const before = await tx.projectCheckpoint.count({ where: { projectId } });
			draftId = (
				await tx.projectCheckpoint.create({
					data: {
						projectId,
						stepId: stage.id,
						stageName: stage.name,
						order: before + 1,
						curatorKind: CheckpointCuratorKind.AI,
						status: CheckpointStatus.Draft,
						goal: "",
					},
					select: { id: true },
				})
			).id;
		}

		await tx.checkpointItem.deleteMany({
			where: { checkpointId: draftId, kind: CheckpointItemKind.Input },
		});
		await createCheckpointItems(tx, draftId, CheckpointItemKind.Input, items);

		return draftId;
	});
};

/** The rows the about step is checked against; the speciality only when one is being edited. */
export const entryAboutState = (
	userId: string,
	workDirectionId: string,
	specialityId: string | undefined,
) =>
	Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: { onboardingDone: true, agreements: true },
		}),
		prisma.workDirection.findUnique({
			where: { id: workDirectionId },
			select: { id: true },
		}),
		specialityId
			? prisma.speciality.findFirst({
					where: { id: specialityId, userId },
					select: { id: true },
				})
			: null,
	]);

/** The about step in one transaction: terms, profile, user, speciality — which also finishes onboarding. */
export const saveEntryAbout = ({
	userId,
	onboardingDone,
	acceptances,
	name,
	agreements,
	profileData,
	specialityId,
	specialityData,
}: {
	userId: string;
	onboardingDone: boolean;
	acceptances: Prisma.LegalAcceptanceCreateManyInput[];
	name: string;
	agreements: Record<string, unknown>;
	profileData: { name: string; yearOfBirth: number; timezone: string };
	specialityId: string | null;
	specialityData: {
		name: string;
		level: SkillLevel;
		workDirectionId: string;
		specialization: string;
	};
}) =>
	prisma.$transaction(async (tx) => {
		if (acceptances.length) {
			await tx.legalAcceptance.createMany({ data: acceptances });
		}
		await tx.profile.upsert({
			where: { userId },
			create: {
				userId,
				...profileData,
				primaryInterest: PrimaryInterest.Author,
			},
			// The column defaults to Specialist, so a profile left half-way through
			// onboarding has no chosen interest yet; a finished one has.
			update: {
				...profileData,
				...(onboardingDone
					? null
					: { primaryInterest: PrimaryInterest.Author }),
			},
		});

		// The session reads `User.name`, the profile pages read `Profile.name`.
		await tx.user.update({
			where: { id: userId },
			data: {
				name,
				agreements,
				onboardingDone: true,
			},
		});

		if (specialityId) {
			await tx.speciality.update({
				where: { id: specialityId },
				data: specialityData,
			});
		} else {
			await tx.speciality.create({
				data: { ...specialityData, userId },
			});
		}
	});

export const yearOfBirthOf = async (userId: string) =>
	(
		await prisma.profile.findUnique({
			where: { userId },
			select: { yearOfBirth: true },
		})
	)?.yearOfBirth;
