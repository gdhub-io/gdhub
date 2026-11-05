import dayjs from "dayjs";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointJournalKind,
	type CheckpointVerdict,
	type EvidenceMatch,
} from "@/config/prisma-enums";
import { characterFace } from "@/lib/checkpoints/curator-characters";
import { devlogText, devlogWords } from "@/lib/checkpoints/curator-text";
import { firstLine, reviewDetails } from "@/lib/checkpoints/journal-text";
import {
	canRebuildIn,
	canRegenerateIn,
	openSteps,
	revisionsOf,
	withoutRevisions,
} from "@/lib/checkpoints/regenerate";
import { sprintOfDate, sprintRange } from "@/lib/checkpoints/sprints";
import { dayOneDevlogsWhere } from "@/repositories/checkpoints/day-one";
import type { JournalRead } from "@/services/checkpoints/flows/evidence-seen";
import { prisma } from "@/services/prisma";
import type {
	CuratorJournalViewDto,
	JournalMessageDto,
	JournalMessageKind,
	JournalRevisionDto,
	JournalSide,
} from "@/types/checkpoint-journal";
import type { CallNotes, PlanAdvice } from "@/types/checkpoints";

/**
 * The curator journal as admins read it (GDHUB-120): one checkpoint's 28 days
 * as a conversation — the curator and the platform on one side, the author and
 * the team on the other — and the same days by subject: the plan, the
 * artifacts, the devlogs. Built from the journal and from what the team's own
 * rows already keep; nothing here is written.
 */
/** How many of the project's artifacts from before the checkpoint the Inputs tab lists. */
const BEFORE_SHOWN = 20;

const journalViewSelect = {
	id: true,
	projectId: true,
	status: true,
	goal: true,
	verdict: true,
	verdictNote: true,
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
			evidence: {
				orderBy: { createdAt: "asc" },
				select: {
					match: true,
					matchNote: true,
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
} as const;

type MessageEntry = {
	id: string;
	kind: string;
	sprint: number | null;
	link: string | null;
	devlogId: string | null;
	input: unknown;
	output: unknown;
	createdAt: Date;
};

export type MessageHelpers = {
	startedAt: Date | null;
	devlogTitle: (id: string) => string | null;
	nameOf: (id: string | null) => string | null;
	taskName: (id: string | null) => string | null;
};

/** What an answer said, as text: a letter, a review, a look. */
const answerText = (output: unknown) => {
	const said = (output ?? {}) as {
		message?: string | null;
		summary?: string;
		note?: string;
		shows?: string | null;
	};
	return said.summary ?? said.message ?? said.note ?? said.shows ?? null;
};

const historyOf = (input: unknown): JournalRevisionDto[] =>
	revisionsOf(input).map((revision) => ({
		at: revision.at,
		mode: revision.mode,
		hint: revision.hint,
		previous: answerText(revision.previousOutput),
	}));

/** One journal row as the conversation shows it; null for rows it does not show. */
export const entryMessage = (
	entry: MessageEntry,
	{ startedAt, devlogTitle, nameOf, taskName }: MessageHelpers,
): JournalMessageDto | null => {
	const base = messageBase(startedAt);
	// The revisions are shown as the message's history, not again in its source.
	const source = { input: withoutRevisions(entry.input), output: entry.output };
	const at = entry.createdAt;
	const read = entry.input as JournalRead | null;
	const message = (dto: JournalMessageDto): JournalMessageDto => ({
		...dto,
		history: historyOf(entry.input),
	});
	switch (entry.kind) {
		case CheckpointJournalKind.Letter: {
			const input = entry.input as { letter?: string; moment?: string };
			const output = entry.output as {
				message?: string | null;
				note?: string;
			};
			return message({
				...base(entry.id, at, "curator", "letter"),
				variant:
					input.letter ?? (input.moment === "midway" ? "advice" : "tasksCheck"),
				text: output.message ?? output.note ?? null,
				source,
			});
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
			return message(
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
			return message({
				...base(entry.id, at, "curator", "looked"),
				variant,
				title:
					variant === "media"
						? (((entry.devlogId && devlogTitle(entry.devlogId)) ||
								read?.devlog) ??
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
		}
		case CheckpointJournalKind.Verdict: {
			const output = entry.output as {
				by: "ai" | "curator";
				proposed: CheckpointVerdict | null;
				settled: CheckpointVerdict | null;
				note?: string;
			};
			return message({
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
		}
		case CheckpointJournalKind.Platform: {
			const input = entry.input as { to: string };
			const output = entry.output as {
				title: string;
				message: string;
				sent: boolean;
			};
			return message({
				...base(entry.id, at, "platform", "sent"),
				who: nameOf(input.to),
				title: output.title,
				details: output.sent ? [] : [{ label: "sent", value: "failed" }],
				source,
			});
		}
		default:
			return null;
	}
};

const messageBase =
	(startedAt: Date | null) =>
	(
		id: string,
		at: Date,
		side: JournalSide,
		kind: JournalMessageKind,
	): JournalMessageDto => ({
		id,
		at: at.toISOString(),
		sprint: startedAt ? sprintOfDate(startedAt, at) : null,
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
		regenerable: false,
		history: [],
	});

/** A devlog as the view shows it: its words, number, author and day. */
const devlogSelect = {
	id: true,
	number: true,
	content: true,
	contentEditor: true,
	publishedAt: true,
	authorId: true,
} as const;

export const getJournalView = async (
	checkpointId: string,
): Promise<CuratorJournalViewDto | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: journalViewSelect,
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
				lte: dayjs(sprintRange(startedAt, SPRINTS_PER_CHECKPOINT).to)
					.add(2, "day")
					.toDate(),
			}
		: null;

	const none = Promise.resolve([]);
	const [before, artifacts, devlogs, dayOne] = await Promise.all([
		startedAt
			? prisma.projectArtifact.findMany({
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
			: none,
		window
			? prisma.projectArtifact.findMany({
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
				})
			: none,
		window
			? prisma.projectReport.findMany({
					where: {
						projectId: checkpoint.projectId,
						isSystem: false,
						publishedAt: window,
					},
					orderBy: { publishedAt: "asc" },
					select: devlogSelect,
				})
			: none,
		startedAt
			? dayOneDevlogsWhere({ ...checkpoint, id: checkpointId }).then((where) =>
					prisma.projectReport.findMany({
						where,
						orderBy: { publishedAt: "asc" },
						select: devlogSelect,
					}),
				)
			: none,
	]);

	const entries = checkpoint.journal;
	const words = new Map(
		[...devlogs, ...dayOne].map((row) => [row.id, devlogWords(row)]),
	);
	const devlogTitle = (id: string) => firstLine(words.get(id) ?? "");
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
							...dayOne.map((row) => row.authorId),
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
	// An artifact may prove several tasks, and a task carry several artifacts.
	const tasksOfArtifact = new Map<string, string[]>();
	for (const item of tasks) {
		for (const { artifact } of item.evidence) {
			tasksOfArtifact.set(artifact.id, [
				...(tasksOfArtifact.get(artifact.id) ?? []),
				item.text,
			]);
		}
	}
	const evidenceLines = (item: (typeof checkpoint.items)[number]) =>
		item.evidence.map(({ artifact, match, matchNote }) => ({
			name: artifact.name,
			type: artifact.type,
			link: artifact.link,
			match,
			note: matchNote,
		}));

	const base = messageBase(startedAt);
	const messages: JournalMessageDto[] = [];
	const steps = openSteps(checkpoint, entries);

	for (const entry of entries) {
		const message = entryMessage(entry, {
			startedAt,
			devlogTitle,
			nameOf,
			taskName,
		});
		if (message) {
			messages.push({
				...message,
				regenerable: canRegenerateIn(steps, entry),
			});
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
		const proves = tasksOfArtifact.get(row.id) ?? [];
		messages.push({
			...base(row.id, row.createdAt, "team", "artifact"),
			who: nameOf(row.createdById),
			title: row.name,
			variant: row.type,
			details: [
				...proves.map((task) => ({ label: "task", value: task })),
				{ label: "link", value: row.link },
			],
			source: row,
		});
	}
	for (const row of devlogs) {
		messages.push({
			...base(row.id, row.publishedAt, "team", "devlog"),
			who: nameOf(row.authorId),
			title: devlogTitle(row.id),
			variant: row.number ? String(row.number) : null,
			source: { id: row.id, number: row.number, content: row.content },
		});
	}
	messages.sort((a, b) => a.at.localeCompare(b.at));

	// One pass: the latest look at each task and link, each devlog's media, the
	// settled verdict, and what the looks cost in links and video.
	type Entry = (typeof entries)[number];
	const evidenceOf = new Map<string, Entry>();
	const artifactLookOf = new Map<string, Entry>();
	const mediaOf = new Map<string, Entry[]>();
	let verdictEntry: Entry | undefined;
	const looked = { links: 0, unread: 0, videoSeconds: 0 };
	for (const entry of entries) {
		const read = entry.input as JournalRead | null;
		if (entry.kind === CheckpointJournalKind.Evidence && entry.link) {
			evidenceOf.set(entry.link, entry);
		} else if (entry.kind === CheckpointJournalKind.Artifact && entry.link) {
			artifactLookOf.set(entry.link, entry);
		} else if (
			entry.kind === CheckpointJournalKind.DevlogMedia &&
			entry.devlogId
		) {
			mediaOf.set(entry.devlogId, [
				...(mediaOf.get(entry.devlogId) ?? []),
				entry,
			]);
		} else if (
			entry.kind === CheckpointJournalKind.Verdict &&
			(entry.output as { settled?: unknown }).settled
		) {
			verdictEntry = entry;
		}
		if (
			entry.kind === CheckpointJournalKind.Evidence ||
			entry.kind === CheckpointJournalKind.Artifact ||
			entry.kind === CheckpointJournalKind.DevlogMedia
		) {
			looked.links += 1;
			if (!read?.text && !read?.images) looked.unread += 1;
			looked.videoSeconds += read?.videoSeconds ?? 0;
		}
	}
	const face = ai ? characterFace(checkpoint.curatorCharacter) : null;
	const devlogDto = (row: (typeof devlogs)[number]) => ({
		id: row.id,
		number: row.number,
		publishedAt: row.publishedAt.toISOString(),
		author: nameOf(row.authorId),
		sprint: sprintAt(row.publishedAt),
		text: devlogText(words.get(row.id) ?? ""),
		media: (mediaOf.get(row.id) ?? []).map((entry) => {
			const output = entry.output as { shows?: string | null };
			const read = entry.input as JournalRead | null;
			return {
				link: entry.link,
				text: output.shows ?? null,
				unread: read?.unread ?? null,
				source: { input: entry.input, output: entry.output },
			};
		}),
	});

	return {
		curator: {
			name: face?.name ?? checkpoint.curator?.name ?? "AI curator",
			avatar: face?.avatar ?? checkpoint.curator?.image ?? null,
			ai,
		},
		startedAt: startedAt?.toISOString() ?? null,
		looked,
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
		steps: Array.from({ length: SPRINTS_PER_CHECKPOINT + 1 }, (_, sprint) => ({
			sprint,
			rebuildable: canRebuildIn(steps, sprint),
		})),
		finishedAt: verdictEntry?.createdAt.toISOString() ?? null,
		verdict: checkpoint.verdict && {
			verdict: checkpoint.verdict,
			note: checkpoint.verdictNote,
		},
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
				evidence: evidenceLines(item),
				doneIn: item.evidence[0]
					? sprintAt(item.evidence[0].artifact.createdAt)
					: null,
			})),
		},
		inputs: {
			items: inputs.map((item) => ({
				id: item.id,
				text: item.text,
				evidence: evidenceLines(item),
			})),
			before: before.map((row) => ({
				id: row.id,
				name: row.name,
				type: row.type,
				link: row.link,
				addedAt: row.createdAt.toISOString(),
			})),
			devlogs: dayOne.map(devlogDto),
		},
		artifacts: artifacts.map((row) => {
			const proves = tasksOfArtifact.get(row.id) ?? [];
			const look = proves.length
				? evidenceOf.get(row.link)
				: artifactLookOf.get(row.link);
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
				tasks: proves,
				read: look
					? {
							match: output?.match ?? null,
							text: output?.note ?? output?.shows ?? null,
							source: { input: look.input, output: look.output },
						}
					: null,
			};
		}),
		devlogs: devlogs.map(devlogDto),
	};
};
