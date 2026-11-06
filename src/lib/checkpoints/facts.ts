import { CheckpointItemKind } from "@/config/prisma-enums";
import { CHECKPOINT_SCOPE_DAY, scopeState } from "@/lib/checkpoints/scope";
import type {
	CheckpointDevlogDto,
	CheckpointDto,
	CheckpointEvidenceDto,
	CheckpointItemDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";

/**
 * What a sprint is made of, read off the one payload the page already has.
 *
 * The panel asks two questions of every sprint — what is still open, and what has
 * happened — and both are answers to the same facts. Keeping the reading here
 * rather than in the components means the Status tab and the sidebar's attention
 * dot cannot disagree about whether a sprint wants something.
 */

export type SprintFacts = {
	sprint: CheckpointSprintDto;
	devlog: Omit<CheckpointDevlogDto, "content"> | null;
	/** The scope note, on the sprint day 15 falls in, until it is answered. */
	scopeNote: string | null;
	/** The call-3 window is open: the tasks can change on the call. */
	scopeOpen: boolean;
	marks: { confirmed: number; asked: number; missing: string[] };
	/** Evidence that landed in this sprint and is offered against an outcome. */
	proved: CheckpointEvidenceDto[];
	outcomesProved: CheckpointItemDto[];
};

const outcomesOf = (checkpoint: CheckpointDto) =>
	checkpoint.items.filter((item) => item.kind === CheckpointItemKind.Outcome);

export const sprintFactsOf = (
	checkpoint: CheckpointDto,
	sprint: CheckpointSprintDto,
): SprintFacts => {
	const devlog =
		checkpoint.reports?.find((report) => report.sprint === sprint.number) ??
		null;

	const cells = (checkpoint.pulses ?? []).map((row) => ({
		row,
		cell: row.cells.find((cell) => cell.sprint === sprint.number),
	}));
	const asked = cells.filter(
		({ cell }) =>
			cell && cell.state !== "notOnTeam" && cell.state !== "notAsked",
	);
	const confirmed = asked.filter(({ cell }) => cell?.state === "confirmed");

	const proved = (checkpoint.evidence ?? []).filter(
		(item) => item.sprint === sprint.number && item.itemIds.length > 0,
	);
	const provedIds = new Set(proved.flatMap((item) => item.itemIds));

	const carriesScopeNote =
		CHECKPOINT_SCOPE_DAY >= sprint.firstDay &&
		CHECKPOINT_SCOPE_DAY <= sprint.lastDay;

	const scopeNote =
		carriesScopeNote && checkpoint.midNote && !checkpoint.revisedAt
			? checkpoint.midNote
			: null;

	return {
		sprint,
		devlog,
		scopeNote,
		scopeOpen:
			carriesScopeNote &&
			!!checkpoint.startedAt &&
			scopeState(
				checkpoint.startedAt,
				checkpoint.sessions,
				new Date(),
				checkpoint.curatorKind,
			) === "open",
		marks: {
			confirmed: confirmed.length,
			asked: asked.length,
			missing: asked
				.filter(({ cell }) => cell?.state !== "confirmed")
				.map(({ row }) => row.name ?? ""),
		},
		proved,
		outcomesProved: outcomesOf(checkpoint).filter((item) =>
			provedIds.has(item.id),
		),
	};
};
