import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointJournalKind,
	type CheckpointVerdict,
	type EvidenceMatch,
} from "@/config/prisma-enums";
import { sprintOfDate, sprintRange } from "@/lib/checkpoint-sprints";
import { devlogText } from "@/lib/curator-text";
import type { JournalRead } from "@/repositories/evidence-seen";
import { characterFace } from "@/services/checkpoint-curator/prompts/card";
import { prisma } from "@/services/prisma";
import type { CallNotes, PlanAdvice } from "@/types/checkpoints";

/**
 * The curator journal as admins read it (GDHUB-120): one checkpoint's 28 days
 * as a conversation — the curator and the platform on one side, the author and
 * the team on the other — and the same days by subject: the plan, the
 * artifacts, the devlogs. Built from the journal and from what the team's own
 * rows already keep; nothing here is written.
 */

export type JournalSide = "curator" | "platform" | "team";

export type JournalMessageKind =
	/** A letter of the AI curator; `variant` says which. */
	| "letter"
	/** The AI's read of a sprint for a human curator, before a call. */
	| "brief"
	/** An artifact, a sprint artifact or a devlog's media looked at. */
	| "looked"
	| "verdict"
	/** A letter or reminder the platform sent. */
	| "sent"
	/** A pulse the platform counted from a devlog, an artifact or activity. */
	| "pulseCounted"
	| "artifact"
	| "devlog"
	| "pulse"
	/** The tasks sent for the AI's check. */
	| "tasksSent"
	| "planApproved"
	/** The tasks confirmed for the second half, day 15. */
	| "tasksConfirmed";

export type JournalMessageDto = {
	id: string;
	at: string;
	/** Null before sprint 1 starts or after the 28 days. */
	sprint: number | null;
	side: JournalSide;
	kind: JournalMessageKind;
	/** first · tasksCheck · advice · plan · review · final · report (letters); evidence · artifact · media (looks). */
	variant: string | null;
	/** The person who acted, or the one a letter went to. */
	who: string | null;
	/** The thing the line is about: a letter's subject, an artifact, a devlog. */
	title: string | null;
	/** The letter itself, or what the AI found. */
	text: string | null;
	match: EvidenceMatch | null;
	/** Why a look could not read its link. */
	unread: string | null;
	verdict: {
		proposed: CheckpointVerdict | null;
		settled: CheckpointVerdict | null;
		by: "ai" | "curator";
	} | null;
	/** Labelled facts under "Details". */
	details: { label: string; value: string }[];
	/** What it was made from, raw, under "Source". */
	source: unknown;
};

export type JournalTaskDto = {
	id: string;
	text: string;
	firstWording: string | null;
	cut: boolean;
	addedAt: string | null;
	artifact: { name: string | null; type: string; link: string } | null;
	/** The sprint the artifact that closes it was added in. */
	doneIn: number | null;
	match: EvidenceMatch | null;
	note: string | null;
};

export type JournalArtifactDto = {
	id: string;
	name: string | null;
	type: string;
	link: string;
	addedAt: string;
	addedBy: string | null;
	sprint: number | null;
	/** The task it proves; null when it sits beside the tasks. */
	task: string | null;
	read: {
		match: EvidenceMatch | null;
		text: string | null;
		source: unknown;
	} | null;
};

export type JournalDevlogDto = {
	id: string;
	number: number | null;
	publishedAt: string;
	author: string | null;
	sprint: number | null;
	text: string;
	media: {
		link: string | null;
		text: string | null;
		unread: string | null;
		source: unknown;
	}[];
};

export type CuratorJournalViewDto = {
	curator: { name: string; avatar: string | null; ai: boolean };
	startedAt: string | null;
	sprints: { number: number; from: string; to: string }[];
	/** When the verdict was settled: the conversation's last divider. */
	finishedAt: string | null;
	messages: JournalMessageDto[];
	plan: {
		goal: string;
		sentAt: string | null;
		approvedAt: string | null;
		approvedBy: string | null;
		confirmedAt: string | null;
		tasks: JournalTaskDto[];
	};
	/** What the team came with: the inputs it named, and what the project had made before. */
	inputs: {
		items: {
			id: string;
			text: string;
			artifact: { name: string | null; type: string; link: string } | null;
			match: EvidenceMatch | null;
			note: string | null;
		}[];
		before: {
			id: string;
			name: string | null;
			type: string;
			link: string;
			addedAt: string;
		}[];
	};
	artifacts: JournalArtifactDto[];
	devlogs: JournalDevlogDto[];
};

/** How many of the project's artifacts from before the checkpoint the Inputs tab lists. */
const BEFORE_SHOWN = 20;

/**
 * A review's notes and halfway advice as labelled lines: how the sprint stands,
 * each task, the focus set for the next sprint, the advice under the tasks.
 */
const reviewDetails = (
	notes: CallNotes | null | undefined,
	advice: Pick<PlanAdvice, "tasks" | "add"> | null | undefined,
	taskName: (id: string | null) => string | null,
) => [
	...(notes?.inShort ? [{ label: "inShort", value: notes.inShort }] : []),
	...(notes?.discussed ?? []).map((row) => ({
		label: taskName(row.itemId) ?? row.itemId,
		value: row.text,
	})),
	...(notes?.agreed.length
		? [
				{
					label: "focus",
					value: notes.agreed.map((row) => row.text).join("\n"),
				},
			]
		: []),
	...(advice?.tasks.length || advice?.add.length
		? [
				{
					label: "advice",
					value: [
						...advice.tasks.map(
							(row) => `${taskName(row.itemId) ?? row.itemId}: ${row.note}`,
						),
						...advice.add.map((line) => `+ ${line}`),
					].join("\n"),
				},
			]
		: []),
];

/** The first line of a devlog, short enough to stand as its title. */
const firstLine = (content: string) =>
	content
		.split("\n")
		.find((line) => line.trim())
		?.trim()
		.slice(0, 120) ?? "";

export const getJournalView = async (
	checkpointId: string,
): Promise<CuratorJournalViewDto | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			goal: true,
			curatorKind: true,
			curatorCharacter: true,
			startedAt: true,
			dueAt: true,
			planCheckedAt: true,
			goalAgreedAt: true,
			goalAgreedById: true,
			scopeConfirmedAt: true,
			curator: { select: { name: true, image: true } },
			project: { select: { authorId: true } },
			items: {
				orderBy: { order: "asc" },
				select: {
					id: true,
					kind: true,
					text: true,
					originalText: true,
					cut: true,
					addedAt: true,
					evidenceMatch: true,
					evidenceMatchNote: true,
					artifact: {
						select: {
							id: true,
							name: true,
							type: true,
							link: true,
							createdAt: true,
						},
					},
				},
			},
			pulses: {
				where: { confirmedAt: { not: null } },
				select: {
					id: true,
					week: true,
					confirmedAt: true,
					source: true,
					teamMember: { select: { userId: true } },
				},
			},
			journal: {
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					kind: true,
					sprint: true,
					link: true,
					devlogId: true,
					itemId: true,
					input: true,
					output: true,
					createdAt: true,
				},
			},
		},
	});
	if (!checkpoint) return null;
	const tasks = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome,
	);
	const inputs = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Input,
	);

	const { startedAt } = checkpoint;
	const ai = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const sprintAt = (at: Date) =>
		startedAt ? sprintOfDate(startedAt, at) : null;
	// The 28 days, and the verdict's day after them.
	const window = startedAt
		? {
				gte: startedAt,
				lte: new Date(
					sprintRange(startedAt, SPRINTS_PER_CHECKPOINT).to.getTime() +
						2 * 24 * 60 * 60 * 1000,
				),
			}
		: null;

	const before = startedAt
		? await prisma.projectArtifact.findMany({
				where: {
					projectId: checkpoint.projectId,
					createdAt: { lt: startedAt },
				},
				orderBy: { createdAt: "desc" },
				take: BEFORE_SHOWN,
				select: {
					id: true,
					name: true,
					type: true,
					link: true,
					createdAt: true,
				},
			})
		: [];
	const [artifacts, devlogs] = window
		? await Promise.all([
				prisma.projectArtifact.findMany({
					where: { projectId: checkpoint.projectId, createdAt: window },
					orderBy: { createdAt: "asc" },
					select: {
						id: true,
						name: true,
						type: true,
						link: true,
						createdAt: true,
						createdById: true,
					},
				}),
				prisma.projectReport.findMany({
					where: {
						projectId: checkpoint.projectId,
						isSystem: false,
						publishedAt: window,
					},
					orderBy: { publishedAt: "asc" },
					select: {
						id: true,
						number: true,
						content: true,
						publishedAt: true,
						authorId: true,
					},
				}),
			])
		: [[], []];

	const entries = checkpoint.journal;
	const devlogTitle = new Map(
		devlogs.map((row) => [row.id, firstLine(row.content)]),
	);
	const recipients = entries.flatMap((entry) =>
		entry.kind === CheckpointJournalKind.Platform
			? [(entry.input as { to: string }).to]
			: [],
	);
	const people = new Map(
		(
			await prisma.user.findMany({
				where: {
					id: {
						in: [
							checkpoint.project.authorId,
							...(checkpoint.goalAgreedById ? [checkpoint.goalAgreedById] : []),
							...artifacts.map((row) => row.createdById),
							...devlogs.map((row) => row.authorId),
							...checkpoint.pulses.map((row) => row.teamMember.userId),
							...recipients,
						],
					},
				},
				select: { id: true, name: true },
			})
		).map((user) => [user.id, user.name]),
	);
	const nameOf = (id: string | null) => (id ? (people.get(id) ?? null) : null);
	const author = nameOf(checkpoint.project.authorId);
	const taskText = new Map(tasks.map((item) => [item.id, item.text]));
	const taskName = (id: string | null) => (id && taskText.get(id)) || null;
	const itemOfArtifact = new Map(
		tasks.flatMap((item) => (item.artifact ? [[item.artifact.id, item]] : [])),
	);

	const base = (
		id: string,
		at: Date,
		side: JournalSide,
		kind: JournalMessageKind,
	): JournalMessageDto => ({
		id,
		at: at.toISOString(),
		sprint: sprintAt(at),
		side,
		kind,
		variant: null,
		who: null,
		title: null,
		text: null,
		match: null,
		unread: null,
		verdict: null,
		details: [],
		source: null,
	});

	const messages: JournalMessageDto[] = [];

	for (const entry of entries) {
		const source = { input: entry.input, output: entry.output };
		const at = entry.createdAt;
		const read = entry.input as JournalRead | null;
		switch (entry.kind) {
			case CheckpointJournalKind.Letter: {
				const input = entry.input as { letter?: string; moment?: string };
				const output = entry.output as {
					message?: string | null;
					note?: string;
				};
				messages.push({
					...base(entry.id, at, "curator", "letter"),
					variant:
						input.letter ??
						(input.moment === "midway" ? "advice" : "tasksCheck"),
					text: output.message ?? output.note ?? null,
					source,
				});
				break;
			}
			case CheckpointJournalKind.Review: {
				const output = entry.output as {
					audience?: "curator";
					message?: string;
					summary?: string;
					notes?: CallNotes | null;
					advice?: Pick<PlanAdvice, "tasks" | "add"> | null;
				};
				const details = reviewDetails(output.notes, output.advice, taskName);
				messages.push(
					output.audience
						? {
								...base(entry.id, at, "curator", "brief"),
								title: String((entry.sprint ?? 0) + 1),
								details,
								source,
							}
						: {
								...base(entry.id, at, "curator", "letter"),
								variant: output.summary
									? "report"
									: entry.sprint === SPRINTS_PER_CHECKPOINT
										? "final"
										: "review",
								title: entry.sprint ? String(entry.sprint) : null,
								text: output.summary ?? output.message ?? null,
								details,
								source,
							},
				);
				break;
			}
			case CheckpointJournalKind.Evidence:
			case CheckpointJournalKind.Artifact:
			case CheckpointJournalKind.DevlogMedia: {
				const output = entry.output as {
					match?: EvidenceMatch;
					note?: string | null;
					shows?: string | null;
				};
				const variant =
					entry.kind === CheckpointJournalKind.Evidence
						? "evidence"
						: entry.kind === CheckpointJournalKind.Artifact
							? "artifact"
							: "media";
				messages.push({
					...base(entry.id, at, "curator", "looked"),
					variant,
					title:
						variant === "media"
							? ((entry.devlogId && devlogTitle.get(entry.devlogId)) ??
								read?.devlog ??
								null)
							: (read?.artifactName ?? read?.task ?? null),
					text: output.note ?? output.shows ?? null,
					unread: read?.unread ?? null,
					match: output.match ?? null,
					details: [
						...(read?.task ? [{ label: "task", value: read.task }] : []),
						...(entry.link ? [{ label: "link", value: entry.link }] : []),
					],
					source,
				});
				break;
			}
			case CheckpointJournalKind.Verdict: {
				const output = entry.output as {
					by: "ai" | "curator";
					proposed: CheckpointVerdict | null;
					settled: CheckpointVerdict | null;
					note?: string;
				};
				messages.push({
					...base(
						entry.id,
						at,
						output.by === "ai" ? "platform" : "curator",
						"verdict",
					),
					text: output.note ?? null,
					verdict: {
						proposed: output.proposed,
						settled: output.settled,
						by: output.by,
					},
					source,
				});
				break;
			}
			case CheckpointJournalKind.Platform: {
				const input = entry.input as { to: string };
				const output = entry.output as {
					title: string;
					message: string;
					sent: boolean;
				};
				messages.push({
					...base(entry.id, at, "platform", "sent"),
					who: nameOf(input.to),
					title: output.title,
					text: output.message,
					details: output.sent ? [] : [{ label: "sent", value: "failed" }],
					source,
				});
				break;
			}
		}
	}

	if (checkpoint.planCheckedAt && ai) {
		messages.push({
			...base("tasks-sent", checkpoint.planCheckedAt, "team", "tasksSent"),
			who: author,
		});
	}
	if (checkpoint.goalAgreedAt) {
		messages.push({
			...base(
				"plan-approved",
				checkpoint.goalAgreedAt,
				ai ? "team" : "curator",
				"planApproved",
			),
			who: ai ? nameOf(checkpoint.goalAgreedById) : null,
		});
	}
	if (checkpoint.scopeConfirmedAt) {
		messages.push({
			...base(
				"tasks-confirmed",
				checkpoint.scopeConfirmedAt,
				"team",
				"tasksConfirmed",
			),
			who: author,
		});
	}
	for (const pulse of checkpoint.pulses) {
		const at = pulse.confirmedAt as Date;
		const who = nameOf(pulse.teamMember.userId);
		messages.push(
			pulse.source === "email"
				? { ...base(pulse.id, at, "team", "pulse"), who, source: pulse }
				: {
						...base(pulse.id, at, "platform", "pulseCounted"),
						who,
						variant: pulse.source,
						source: pulse,
					},
		);
	}
	for (const row of artifacts) {
		const item = itemOfArtifact.get(row.id);
		messages.push({
			...base(row.id, row.createdAt, "team", "artifact"),
			who: nameOf(row.createdById),
			title: row.name,
			variant: row.type,
			details: [
				...(item ? [{ label: "task", value: item.text }] : []),
				{ label: "link", value: row.link },
			],
			source: row,
		});
	}
	for (const row of devlogs) {
		messages.push({
			...base(row.id, row.publishedAt, "team", "devlog"),
			who: nameOf(row.authorId),
			title: firstLine(row.content),
			variant: row.number ? String(row.number) : null,
			source: { id: row.id, number: row.number, content: row.content },
		});
	}
	messages.sort((a, b) => a.at.localeCompare(b.at));

	const lookOf = (
		kind: CheckpointJournalKind,
		pick: (entry: (typeof entries)[number]) => boolean,
	) => entries.filter((entry) => entry.kind === kind && pick(entry)).at(-1);
	const face = ai ? characterFace(checkpoint.curatorCharacter) : null;
	const verdictEntry = entries
		.filter(
			(entry) =>
				entry.kind === CheckpointJournalKind.Verdict &&
				(entry.output as { settled?: unknown }).settled,
		)
		.at(-1);

	return {
		curator: {
			name: face?.name ?? checkpoint.curator?.name ?? "AI curator",
			avatar: face?.avatar ?? checkpoint.curator?.image ?? null,
			ai,
		},
		startedAt: startedAt?.toISOString() ?? null,
		sprints: startedAt
			? Array.from({ length: SPRINTS_PER_CHECKPOINT }, (_, index) => {
					const { from, to } = sprintRange(startedAt, index + 1);
					return {
						number: index + 1,
						from: from.toISOString(),
						to: to.toISOString(),
					};
				})
			: [],
		finishedAt: verdictEntry?.createdAt.toISOString() ?? null,
		messages,
		plan: {
			goal: checkpoint.goal,
			sentAt: ai ? (checkpoint.planCheckedAt?.toISOString() ?? null) : null,
			approvedAt: checkpoint.goalAgreedAt?.toISOString() ?? null,
			approvedBy: nameOf(checkpoint.goalAgreedById),
			confirmedAt: checkpoint.scopeConfirmedAt?.toISOString() ?? null,
			tasks: tasks.map((item) => ({
				id: item.id,
				text: item.text,
				firstWording: item.originalText,
				cut: item.cut,
				addedAt: item.addedAt?.toISOString() ?? null,
				artifact: item.artifact && {
					name: item.artifact.name,
					type: item.artifact.type,
					link: item.artifact.link,
				},
				doneIn: item.artifact ? sprintAt(item.artifact.createdAt) : null,
				match: item.evidenceMatch,
				note: item.evidenceMatchNote,
			})),
		},
		inputs: {
			items: inputs.map((item) => ({
				id: item.id,
				text: item.text,
				artifact: item.artifact && {
					name: item.artifact.name,
					type: item.artifact.type,
					link: item.artifact.link,
				},
				match: item.evidenceMatch,
				note: item.evidenceMatchNote,
			})),
			before: before.map((row) => ({
				id: row.id,
				name: row.name,
				type: row.type,
				link: row.link,
				addedAt: row.createdAt.toISOString(),
			})),
		},
		artifacts: artifacts.map((row) => {
			const item = itemOfArtifact.get(row.id);
			const look = item
				? lookOf(
						CheckpointJournalKind.Evidence,
						(entry) => entry.itemId === item.id,
					)
				: lookOf(
						CheckpointJournalKind.Artifact,
						(entry) => entry.link === row.link,
					);
			const output = look?.output as
				| {
						match?: EvidenceMatch;
						note?: string | null;
						shows?: string | null;
				  }
				| undefined;
			return {
				id: row.id,
				name: row.name,
				type: row.type,
				link: row.link,
				addedAt: row.createdAt.toISOString(),
				addedBy: nameOf(row.createdById),
				sprint: sprintAt(row.createdAt),
				task: item ? (taskText.get(item.id) ?? null) : null,
				read: look
					? {
							match: output?.match ?? null,
							text: output?.note ?? output?.shows ?? null,
							source: { input: look.input, output: look.output },
						}
					: null,
			};
		}),
		devlogs: devlogs.map((row) => ({
			id: row.id,
			number: row.number,
			publishedAt: row.publishedAt.toISOString(),
			author: nameOf(row.authorId),
			sprint: sprintAt(row.publishedAt),
			text: devlogText(row.content),
			media: entries
				.filter(
					(entry) =>
						entry.kind === CheckpointJournalKind.DevlogMedia &&
						entry.devlogId === row.id,
				)
				.map((entry) => {
					const output = entry.output as { shows?: string | null };
					const read = entry.input as JournalRead | null;
					return {
						link: entry.link,
						text: output.shows ?? null,
						unread: read?.unread ?? null,
						source: { input: entry.input, output: entry.output },
					};
				}),
		})),
	};
};
