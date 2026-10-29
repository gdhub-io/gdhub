import {
	IconArrowUpRight,
	IconChevronDown,
	IconChevronUp,
	IconCircleCheck,
	IconLayoutGridAdd,
	IconNotebook,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import type {
	CheckpointDto,
	CheckpointSessionDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { PathNode } from "./PathNode";
import { PulseChip } from "./PulseChip";
import styles from "./style.module.scss";

export function DoneSprint({
	sprint,
	checkpoint,
	sessions,
	opened,
	setOpened,
	held,
	sessionDone,
}: {
	sprint: CheckpointSprintDto;
	checkpoint: CheckpointDto;
	sessions: CheckpointSessionDto[];
	opened: number[];
	setOpened: Dispatch<SetStateAction<number[]>>;
	held: (session: CheckpointSessionDto) => boolean;
	sessionDone: (session: CheckpointSessionDto) => ReactNode;
}) {
	const { t } = useTranslate();

	const stat = (icon: ReactNode, count: number, title: string) => (
		<Tooltip title={title}>
			<span className={styles.stat}>
				{icon}
				{count}
			</span>
		</Tooltip>
	);
	const section = (label: string, rows: ReactNode) => (
		<div className={styles.block}>
			<span className={styles.sectionLabel}>{label}</span>
			{rows}
		</div>
	);

	const devlog = checkpoint.reports?.find(
		(report) => report.sprint === sprint.number,
	);
	// Only what this sprint itself added: a share of the checkpoint's total
	// would need a per-sprint target nobody set.
	const evidence = (checkpoint.evidence ?? []).filter(
		(item) => item.sprint === sprint.number,
	);
	const added = new Set([
		...evidence.map((item) => item.artifact.id),
		...(checkpoint.builds ?? [])
			.filter((build) => build.sprint === sprint.number)
			.map((build) => build.id),
	]).size;
	const open = opened.includes(sprint.number);
	const session = sessions.find(
		(item) => item.index === sprint.number && held(item),
	);
	const proofOf = new Map(
		evidence.flatMap((item) =>
			item.itemIds.map((id) => [id, item.artifact] as const),
		),
	);
	const closed = proofOf.size;
	const tasks = checkpoint.items.filter((item) => proofOf.has(item.id));
	// What the sprint added beyond the proof of a closed task.
	const others = [
		...new Map(
			evidence
				.filter((item) => item.itemIds.length === 0)
				.map((item) => [item.artifact.id, item.artifact]),
		).values(),
	];

	const toggle = () =>
		setOpened((list) =>
			open
				? list.filter((item) => item !== sprint.number)
				: [...list, sprint.number],
		);

	return (
		<PathNode key={sprint.number} marker="done">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: folded, the whole card opens it; open, the head folds it back; the chevron is the keyboard control */}
			<div
				className={
					open ? styles.summary : `${styles.summary} ${styles.summaryFolded}`
				}
				onClick={open ? undefined : toggle}
			>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: see the card above */}
				<div className={styles.summaryHead} onClick={open ? toggle : undefined}>
					<span className={styles.summaryTitle}>
						{t("workflow.path.sprint.name", "Sprint {number}", {
							number: String(sprint.number),
						})}
						<span className={styles.summaryDates}>
							{dayRange(sprint.from, sprint.to)}
						</span>
					</span>
					<div className={styles.summaryMeta}>
						{devlog &&
							stat(
								<IconNotebook size={14} />,
								1,
								t("workflow.path.sprint.devlog", "Devlog"),
							)}
						{added > 0 &&
							stat(
								<IconLayoutGridAdd size={14} />,
								added,
								t(
									"workflow.path.sprint.added",
									"{count, plural, one {# artifact added} other {# artifacts added}}",
									{ count: added },
								),
							)}
						{closed > 0 &&
							stat(
								<IconCircleCheck size={14} />,
								closed,
								t(
									"workflow.path.sprint.closedThis",
									"{count, plural, one {# task closed this sprint} other {# tasks closed this sprint}}",
									{ count: closed },
								),
							)}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: only keeps the pulse's click from folding the sprint */}
						<span onClick={(event) => event.stopPropagation()}>
							<PulseChip
								rows={checkpoint.pulses ?? []}
								sprint={sprint}
								day={checkpoint.day}
								still
							/>
						</span>
						<Button
							type="text"
							size="small"
							aria-expanded={open}
							aria-label={t("workflow.path.sprint.details", "Sprint details")}
							icon={
								open ? (
									<IconChevronUp size={16} />
								) : (
									<IconChevronDown size={16} />
								)
							}
							onClick={(event) => {
								event.stopPropagation();
								toggle();
							}}
						/>
					</div>
				</div>

				{open && (
					<>
						{session && sessionDone(session)}
						{tasks.length > 0 &&
							section(
								t("workflow.path.sprint.tasksClosed", "Tasks closed"),
								tasks.map((item) => {
									const proof = proofOf.get(item.id);
									return (
										<div key={item.id} className={styles.outcome}>
											<IconCircleCheck
												size={16}
												className={styles.taskIconDone}
											/>
											<span className={styles.grow}>{item.text}</span>
											{proof && <ArtifactLink artifact={proof} />}
										</div>
									);
								}),
							)}
						{others.length > 0 &&
							section(
								t("workflow.path.sprint.artifactsAdded", "Artifacts added"),
								others.map((artifact) => (
									<Typography.Link
										key={artifact.id}
										href={artifact.link}
										target="_blank"
										rel="noreferrer"
										className={styles.link}
									>
										<IconLayoutGridAdd size={16} />
										{artifact.name ?? artifact.link}
										<IconArrowUpRight size={14} />
									</Typography.Link>
								)),
							)}
						{devlog && (
							<Link href={`/devlog/${devlog.id}`} className={styles.link}>
								<IconNotebook size={16} />
								{t("workflow.path.sprint.devlogOf", "Sprint {number} devlog", {
									number: String(sprint.number),
								})}
								<IconArrowUpRight size={14} />
							</Link>
						)}
						{!session &&
							!devlog &&
							others.length === 0 &&
							tasks.length === 0 && (
								<span className={styles.secondary}>
									{t(
										"workflow.path.sprint.empty",
										"Nothing was added in this sprint.",
									)}
								</span>
							)}
					</>
				)}
			</div>
		</PathNode>
	);
}
