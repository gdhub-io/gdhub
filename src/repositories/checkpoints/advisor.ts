import { CheckpointStatus, TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { teamCapacity } from "@/lib/checkpoints/capacity";
import { getCheckpointCore } from "@/repositories/checkpoints/detail";
import {
	checkpointSelect,
	withAcceptedTerms,
} from "@/repositories/checkpoints/select";
import { prisma } from "@/services/prisma";
import { CONFIRMED_MEMBERS } from "../scout.games";
import { briefAuthor, briefMemberSelect, lastVerdict } from "./brief";
import { withProgress } from "./checkpoint";

const advisorCheckpointSelect = {
	...checkpointSelect,
	project: { select: { name: true, slug: true } },
} as const;

/**
 * The advisor's own board, in the order the work reaches them.
 *
 * Four lists rather than one filtered table: what is asked of them differs by
 * group — an answer, then the running weeks, then nothing at all — and a single
 * list sorted by date would bury the one group that is waiting on them.
 *
 * The fourth is the ones they could not take. Declining clears `curatorId`, so
 * without it those checkpoints would vanish from the curator's own history the
 * moment they said no.
 *
 * The rows are the same shape the author's list uses, so both sides of a
 * checkpoint are drawn by the same cards.
 *
 * Scoped by `curatorId`: a curator sees the checkpoints handed to them and no
 * others, whatever project those belong to.
 */
export const listAdvisorCheckpoints = async (curatorId: string) => {
	const [rows, declined] = await Promise.all([
		prisma.projectCheckpoint.findMany({
			where: {
				curatorId,
				status: {
					in: [
						CheckpointStatus.AwaitingCurator,
						CheckpointStatus.Active,
						CheckpointStatus.Review,
						CheckpointStatus.Closed,
					],
				},
			},
			orderBy: { createdAt: "desc" },
			select: advisorCheckpointSelect,
		}),
		// Somebody else runs these now, or nobody does — either way they are this
		// curator's history. A checkpoint they declined and were later given again
		// belongs to the lists above, not here.
		prisma.projectCheckpoint.findMany({
			where: {
				declinedCuratorIds: { has: curatorId },
				NOT: { curatorId },
			},
			orderBy: { updatedAt: "desc" },
			select: advisorCheckpointSelect,
		}),
	]);

	const of = (...statuses: CheckpointStatus[]) =>
		rows
			.filter((row) => statuses.includes(row.status))
			.map((row) => withProgress(withAcceptedTerms(row)));

	return {
		asked: of(CheckpointStatus.AwaitingCurator),
		running: of(CheckpointStatus.Active, CheckpointStatus.Review),
		closed: of(CheckpointStatus.Closed),
		declined: declined.map((row) => withProgress(withAcceptedTerms(row))),
	};
};

/**
 * One checkpoint, for the curator running it.
 *
 * The right to see it comes from being named on it — a curator is not a member
 * of the project — so this asks for the row by both ids at once rather than
 * checking access afterwards.
 */
export const getAdvisorCheckpoint = async (id: string, curatorId: string) => {
	const row = await prisma.projectCheckpoint.findFirst({
		where: { id, curatorId },
		select: advisorCheckpointSelect,
	});

	return row && withProgress(withAcceptedTerms(row));
};

/** How many of the project's devlogs the Project tab leads with. */
const LATEST_DEVLOGS = 3;

/**
 * The checkpoint's card as its curator may read it: the project, the hours its
 * team says it has, each seat's weekly pulse and the devlogs of the 28 days.
 *
 * A curator is not a scout: they are told what the game is and what kind of
 * team makes it, and nothing a deal would be built on — no equity, no files,
 * no investors, and no names. The team is its roles, specialities and levels.
 */
export const getAdvisorProject = async (
	checkpointId: string,
	curatorId: string,
) => {
	const found = prisma.projectCheckpoint.findFirst({
		where: { id: checkpointId, curatorId },
		select: {
			projectId: true,
			project: {
				select: {
					name: true,
					description: true,
					coverImage: true,
					videoLink: true,
					startedAt: true,
					updatedAt: true,
					genre: true,
					platform: true,
					setting: true,
					visualStyle: true,
					audition: true,
					links: true,
					workflow: {
						select: { currentStep: { select: { name: true } } },
					},
					reports: {
						where: { isSystem: false },
						orderBy: { publishedAt: "desc" },
						take: LATEST_DEVLOGS,
						select: { id: true, publishedAt: true, content: true },
					},
					team: {
						select: {
							members: {
								where: CONFIRMED_MEMBERS,
								orderBy: { startedAt: "asc" },
								select: {
									id: true,
									position: true,
									status: true,
									startedAt: true,
									...briefMemberSelect,
								},
							},
						},
					},
				},
			},
		},
	});
	const [checkpoint, detail, previous] = await Promise.all([
		found,
		// The page's own sprints, pulse and devlog reads, so the card cannot draw a
		// week differently from the checkpoint it describes.
		getCheckpointCore(checkpointId),
		found.then((row) => row && lastVerdict(row.projectId, checkpointId)),
	]);

	if (!checkpoint) return null;

	const { project } = checkpoint;
	const members = project.team?.members ?? [];
	// The pulse and the checkpoint's devlogs are shown to the curator running
	// it, not to one still deciding whether to take it.
	const accepted =
		!!detail &&
		detail.status !== CheckpointStatus.Draft &&
		detail.status !== CheckpointStatus.AwaitingCurator;
	const pulseOf = new Map(
		accepted ? detail.pulses.map((row) => [row.memberId, row.cells]) : [],
	);
	const founder = members.find(
		(member) => member.status === TeamMemberStatus.Founder,
	);
	const hoursOf = (member: (typeof members)[number]) =>
		member.user.profile?.timeForWork ?? null;

	return {
		name: project.name,
		description: project.description,
		coverImage: project.coverImage,
		videoLink: project.videoLink,
		startedAt: project.startedAt,
		updatedAt: project.updatedAt,
		details: {
			genre: project.genre,
			platform: project.platform,
			setting: project.setting,
			visualStyle: project.visualStyle,
			audition: project.audition,
		},
		links: project.links,
		stage: project.workflow?.currentStep?.name ?? null,
		// The same arithmetic the author's payment step shows, so both read one figure.
		capacity: teamCapacity(
			members.map((member) => ({ timeForWork: hoursOf(member) })),
		),
		// The member id stays only as a row key; nothing on it leads to a person.
		author: founder
			? {
					experience: briefAuthor(founder).experience,
					timezone: founder.user.profile?.timezone ?? null,
				}
			: null,
		team: members.map((member) => ({
			id: member.id,
			position: member.position,
			// Without `specialization`: a member's own words are not part of the card.
			speciality: member.speciality && {
				name: member.speciality.name,
				level: member.speciality.level,
			},
			isFounder: member.status === TeamMemberStatus.Founder,
			hoursPerWeek: hoursOf(member),
			startedAt: member.startedAt,
			pulse: pulseOf.get(member.id) ?? [],
		})),
		previous,
		sprints: accepted ? detail.sprints : [],
		/** The project's own latest, whatever checkpoint they belong to. */
		latestDevlogs: project.reports,
		devlogs: (accepted ? detail.reports : []).map((report) => ({
			id: report.id,
			publishedAt: report.publishedAt,
			content: report.content,
			sprint: report.sprint,
		})),
	};
};
