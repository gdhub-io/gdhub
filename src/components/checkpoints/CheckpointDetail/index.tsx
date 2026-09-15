"use client";

import { useTranslate } from "@tolgee/react";
import { App, Flex } from "antd";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCreateCheckpoint } from "@/hooks/checkpoints";
import { sprintFactsOf, sprintNeedsYou } from "@/lib/checkpoint-facts";
import { SPRINTS_PER_CHECKPOINT } from "@/lib/checkpoint-sprints";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointPath, type PathStepView } from "../CheckpointPath";
import { CheckpointStepPanel } from "../CheckpointStepPanel";
import { InputsPanel } from "../InputsPanel";
import { SprintPanel, type SprintTab } from "../SprintPanel";
import { PreparePanel } from "../start/PreparePanel";
import styles from "./style.module.scss";

export type CheckpointDetailProps = {
	checkpoint: CheckpointDto;
};

/** "1–7 Sep", and "28 Sep – 4 Oct" when the sprint crosses a month. */
const range = (from: string, to: string) => {
	const start = dayjs(from);
	const end = dayjs(to);

	return start.month() === end.month()
		? `${start.format("D")}–${end.format("D MMM")}`
		: `${start.format("D MMM")} – ${end.format("D MMM")}`;
};

/**
 * The checkpoint page: the 28 days as a path on the left, the step you picked on
 * the right — frames `Checkpoint — Page · a sprint (Status)` and its siblings.
 *
 * The step and the tab live in the query string so a sprint can be linked to and
 * survives a refresh; nothing about the page is remembered anywhere else.
 */
export function CheckpointDetail({ checkpoint }: CheckpointDetailProps) {
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

	// A draft that has already picked its start date is still on the first step:
	// the status says whether it has been bought, the date does not.
	const defaultStep =
		checkpoint.status === CheckpointStatus.Draft
			? "inputs"
			: checkpoint.verdict
				? "checkpoint"
				: `sprint-${sprints.find((sprint) => sprint.state === "current")?.number ?? 1}`;

	const step = search?.get("step") ?? defaultStep;
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
			label: paid
				? t("checkpoints.path.inputs", "Inputs")
				: t("checkpoints.path.prepare", "Prepare"),
			meta: paid
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
				meta: sprint ? range(sprint.from, sprint.to) : null,
				glyph: !sprint
					? ("ahead" as const)
					: sprint.state === "done"
						? ("done" as const)
						: sprint.state === "current"
							? ("current" as const)
							: ("ahead" as const),
				needsYou: sprintFacts
					? sprintNeedsYou(sprintFacts, checkpoint.day)
					: false,
			};
		}),
		{
			key: "checkpoint",
			label: t("checkpoints.path.checkpoint", "Checkpoint"),
			meta: checkpoint.dueAt ? dayjs(checkpoint.dueAt).format("D MMM") : null,
			glyph: checkpoint.verdict ? "done" : "locked",
		},
	];

	const selected = facts.find((one) => `sprint-${one.sprint.number}` === step);

	return (
		<Flex gap={20} align="flex-start" className={styles.split}>
			<CheckpointPath
				steps={steps}
				selected={step}
				onSelect={(key) => go({ step: key })}
				next={{
					disabled: !checkpoint.verdict || create.isPending,
					reason: t(
						"checkpoints.next.locked",
						"Opens when the verdict is in. It takes you to the steps of a new checkpoint.",
					),
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
											"checkpoints.start.failed",
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
						: t(
								"checkpoints.path.undated",
								"The dates appear once it is paid and the day it starts is set.",
							)
				}
			/>

			<div className={styles.panel}>
				{step === "inputs" &&
					(checkpoint.status === CheckpointStatus.Draft ? (
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
					/>
				)}
			</div>
		</Flex>
	);
}
