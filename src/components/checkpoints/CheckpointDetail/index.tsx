"use client";

import { useTranslate } from "@tolgee/react";
import { App, Flex } from "antd";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCreateCheckpoint } from "@/hooks/checkpoints";
import { sprintFactsOf, sprintNeedsYou } from "@/lib/checkpoint-facts";
import { isPending } from "@/lib/checkpoint-status";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointPath, type PathStepView } from "../CheckpointPath";
import { CheckpointStepPanel } from "../CheckpointStepPanel";
import { InputsPanel } from "../InputsPanel";
import { SprintPanel, type SprintTab } from "../SprintPanel";
import { PreparePanel } from "../start/PreparePanel";
import styles from "./style.module.scss";

export type CheckpointDetailProps = {
	checkpoint: CheckpointDto;
	/**
	 * Who is looking. The author owns the checkpoint and answers for it; the
	 * curator runs it and may write only their review. A curator never sees the
	 * five questions of the purchase — they were answered before it reached them,
	 * and the answers are what Inputs already shows.
	 */
	viewer?: "author" | "curator";
};

/**
 * The checkpoint page: the 28 days as a path on the left, the step you picked on
 * the right — frames `Checkpoint — Page · a sprint (Status)` and its siblings.
 *
 * The step and the tab live in the query string so a sprint can be linked to and
 * survives a refresh; nothing about the page is remembered anywhere else.
 */
export function CheckpointDetail({
	checkpoint,
	viewer = "author",
}: CheckpointDetailProps) {
	const curating = viewer === "curator";
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();

	const sprints = checkpoint.sprints ?? [];
	const facts = useMemo(
		() => sprints.map((sprint) => sprintFactsOf(checkpoint, sprint)),
		[checkpoint, sprints],
	);

	// Nothing below Prepare exists until the 28 days run: a draft has no day one
	// either, and a sprint that opens onto empty tabs reads as a broken page
	// rather than as one that has not started.
	const started = !isPending(checkpoint.status);

	// A checkpoint that has not started opens on Prepare, whatever its dates say:
	// the status decides that, and the date the author picked does not. Without
	// this a paid checkpoint whose chosen day has passed would open onto sprint 1,
	// which is locked.
	const defaultStep = !started
		? "inputs"
		: checkpoint.verdict ||
				!sprints.some((sprint) => sprint.state === "current")
			? // No current sprint means the 28 days are spent: the verdict, written
				// or being written, is the only thing left to look at.
				"checkpoint"
			: `sprint-${sprints.find((sprint) => sprint.state === "current")?.number}`;

	// Two ways to be past paying and short of day one: back from Stripe before
	// the webhook landed, and waiting on the person asked to curate it. The
	// return from Stripe is a hint that the panel should wait — never a claim
	// that anything was paid, which only the status can say.
	const waiting =
		checkpoint.status === CheckpointStatus.AwaitingCurator ||
		(checkpoint.status === CheckpointStatus.Draft &&
			(!!checkpoint.paymentId ||
				// A curator who said no leaves a draft with no money on it: the
				// hold went back. The page still has to say that happened before it
				// becomes an ordinary draft again.
				(!!checkpoint.curatorDeclinedAt && !checkpoint.curator) ||
				search?.get("paid") === "1"));

	const asked = search?.get("step");
	const known =
		asked === "inputs" ||
		asked === "checkpoint" ||
		(!!asked && /^sprint-[1-4]$/.test(asked));
	// A sprint that has not begun has nothing on it to read: the path will not
	// open one, and a link to one lands on the default step instead.
	const ahead =
		sprints.find((sprint) => `sprint-${sprint.number}` === asked)?.state ===
		"ahead";
	const step = started && known && asked && !ahead ? asked : defaultStep;
	const tab = (search?.get("tab") as SprintTab) ?? "status";

	const go = (next: { step?: string; tab?: string }) => {
		const params = new URLSearchParams(search?.toString());

		if (next.step) {
			params.set("step", next.step);
			params.delete("tab");
		}
		if (next.tab) params.set("tab", next.tab);

		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const create = useCreateCheckpoint(checkpoint.projectId);
	const paid = checkpoint.status !== CheckpointStatus.Draft;
	const base = pathname?.replace(/\/[^/]+$/, "") ?? "";

	const steps: PathStepView[] = [
		{
			key: "inputs",
			label:
				paid && !waiting
					? t("checkpoints.path.inputs", "Inputs")
					: t("checkpoints.path.prepare", "Prepare"),
			meta: waiting
				? t("checkpoints.path.waiting", "paid, waiting")
				: paid
					? t("checkpoints.path.bought", "what was bought")
					: t("checkpoints.path.buying", "buying the 28 days"),
			glyph: "start",
		},
		...Array.from({ length: SPRINTS_PER_CHECKPOINT }, (_, index) => {
			const number = index + 1;
			const sprint = sprints.find((one) => one.number === number);
			const sprintFacts = facts.find((one) => one.sprint.number === number);

			return {
				key: `sprint-${number}`,
				label: t("checkpoints.path.sprint", "Sprint {n}", { n: number }),
				meta: sprint ? dayRange(sprint.from, sprint.to) : null,
				// A sprint can only read as current once the 28 days are running. The
				// dates exist before that — the author picked them — and drawing the
				// first sprint in the accent against them claims a run that has not
				// started.
				glyph: !started
					? ("locked" as const)
					: !sprint
						? ("ahead" as const)
						: sprint.state === "done"
							? ("done" as const)
							: sprint.state === "current"
								? ("current" as const)
								: ("ahead" as const),
				needsYou:
					started && sprintFacts
						? sprintNeedsYou(sprintFacts, checkpoint.day)
						: false,
				disabled: !started || sprint?.state === "ahead",
			};
		}),
		{
			key: "checkpoint",
			disabled: !started,
			label: t("checkpoints.path.checkpoint", "Checkpoint"),
			meta: checkpoint.dueAt
				? dayjs.utc(checkpoint.dueAt).format("D MMM")
				: null,
			glyph: checkpoint.verdict ? "done" : "locked",
		},
	];

	const selected = facts.find((one) => `sprint-${one.sprint.number}` === step);

	return (
		<Flex align="stretch" className={styles.split}>
			<CheckpointPath
				className={styles.sidebar}
				steps={steps}
				selected={step}
				onSelect={(key) => go({ step: key })}
				next={{
					// Buying the next checkpoint is the author's move alone.
					hidden: curating,
					disabled: !checkpoint.verdict || create.isPending,
					reason: t("checkpoints.next.locked", "Available after the verdict."),
					// It buys the next checkpoint rather than continuing this one, so
					// it lands on the new draft's first step and nothing is started.
					onClick: checkpoint.verdict
						? async () => {
								try {
									const next = await create.mutateAsync();
									router.push(`${base}/${next.id}`);
								} catch {
									message.error(
										t(
											"checkpoints.prepare.failed",
											"The checkpoint could not be started",
										),
									);
								}
							}
						: undefined,
				}}
				footNote={
					paid
						? null
						: t("checkpoints.path.undated", "Dates appear after payment.")
				}
			/>

			<div className={styles.panel}>
				{step === "inputs" &&
					(curating ? (
						// What was bought, not how: the curator needs the goal, the
						// lists and the days, and none of the questions behind them.
						<InputsPanel checkpoint={checkpoint} />
					) : waiting ? (
						<PreparePanel base={base} paid={checkpoint} />
					) : checkpoint.status === CheckpointStatus.Draft ? (
						<PreparePanel base={base} />
					) : (
						<InputsPanel checkpoint={checkpoint} />
					))}

				{step === "checkpoint" && (
					<CheckpointStepPanel checkpoint={checkpoint} />
				)}

				{!!selected && (
					<SprintPanel
						checkpoint={checkpoint}
						facts={selected}
						tab={tab}
						onTab={(next) => go({ tab: next })}
						onGo={(next) => go({ step: next })}
					/>
				)}
			</div>
		</Flex>
	);
}
