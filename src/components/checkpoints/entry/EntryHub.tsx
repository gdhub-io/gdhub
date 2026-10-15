"use client";

import { IconArrowRight, IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Skeleton, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { checkoutHref } from "@/components/checkpoint-landing/constants";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import type { EntryStatusDto } from "@/types/checkpoints";
import { type ChecklistState, ChecklistStatus } from "./ChecklistStatus";
import styles from "./EntryHub.module.scss";
import { ProjectCover } from "./ProjectOption";

export const ENTRY_HUB_HREF = "/checkpoint/new";
export const ENTRY_ABOUT_HREF = "/checkpoint/new/about";
export const ENTRY_PROJECT_HREF = "/checkpoint/new/project";

export type EntryHubProps = {
	status?: EntryStatusDto;
	/** "Anna Petrova · Game designer" — item 1's line once it is done. */
	aboutSummary?: string;
	loading?: boolean;
	error?: boolean;
	onRetry?: () => void;
};

type Item = {
	key: string;
	state: ChecklistState;
	title: string;
	line: ReactNode;
	action?: ReactNode;
};

/**
 * Hub `/checkpoint/new` (12.0a–c): three items, each locked until the one
 * above it is done. A locked row is not a link and has no hover — there is
 * nothing to press yet, and the lock says so without a tooltip.
 */
export function EntryHub({
	status,
	aboutSummary,
	loading,
	error,
	onRetry,
}: EntryHubProps) {
	const { t } = useTranslate();

	if (loading || (!status && !error))
		return (
			<div className={styles.panel}>
				{[1, 2, 3].map((n) => (
					<div key={n} className={styles.row}>
						<Skeleton
							active
							avatar={{ size: 24 }}
							title={false}
							paragraph={{ rows: 2 }}
						/>
					</div>
				))}
			</div>
		);

	if (error || !status)
		return (
			<div className={styles.panel}>
				<Flex
					className={styles.row}
					align="center"
					justify="space-between"
					gap={16}
				>
					<Typography.Text type="secondary">
						{t("checkpointEntry.loadFailed", "Could not load your progress")}
					</Typography.Text>
					<Button onClick={onRetry}>
						{t("checkpointEntry.retry", "Try again")}
					</Button>
				</Flex>
			</div>
		);

	const project = status.draft
		? status.projects.find(({ id }) => id === status.draft?.projectId)
		: undefined;
	const doneCount =
		status.draft?.items.filter(({ text }) => text.trim()).length ?? 0;
	const aboutDone = status.aboutDone;
	const projectDone = aboutDone && !!project && doneCount > 0;

	const fillIn = (href: string) => (
		<Link href={href}>
			<Button>{t("checkpointEntry.fillIn", "Fill in")}</Button>
		</Link>
	);
	const edit = (href: string) => (
		<Link href={href}>
			<Button>{t("checkpointEntry.edit", "Edit")}</Button>
		</Link>
	);

	const projectLine = () => {
		if (!projectDone || !project)
			return t(
				"checkpointEntry.project.todo",
				"Pick a project or create one, and what's done so far.",
			);

		const summary = project.stage
			? t(
					"checkpointEntry.project.done",
					"{project} · {stage} stage · {count, plural, one {# thing} other {# things}} done so far",
					{ project: project.name, stage: project.stage, count: doneCount },
				)
			: t(
					"checkpointEntry.project.doneNoStage",
					"{project} · {count, plural, one {# thing} other {# things}} done so far",
					{ project: project.name, count: doneCount },
				);

		return (
			<span className={styles.projectLine}>
				<ProjectCover cover={project.cover} size={20} />
				<span className={styles.ellipsis}>{summary}</span>
			</span>
		);
	};

	const checkpointAction = () => {
		if (!projectDone || !project) return undefined;

		if (project.running)
			return (
				<Link href={`/user/project/${project.slug}/workflow`}>
					<Button
						type="primary"
						icon={<IconArrowRight size={16} />}
						iconPlacement="end"
					>
						{t("checkpointEntry.checkpoint.running", "Go to your checkpoint")}
					</Button>
				</Link>
			);

		return (
			<Link href={checkoutHref(project.slug)}>
				<Button
					type="primary"
					icon={<IconArrowRight size={16} />}
					iconPlacement="end"
				>
					{t("checkpointEntry.checkpoint.button", "Set the goal")}
				</Button>
			</Link>
		);
	};

	const items: Item[] = [
		{
			key: "about",
			state: aboutDone ? "done" : "active",
			title: t("checkpointEntry.about.title", "Tell us about yourself"),
			line:
				aboutDone && aboutSummary
					? aboutSummary
					: t(
							"checkpointEntry.about.todo",
							"Your name and speciality — about a minute.",
						),
			action: aboutDone ? edit(ENTRY_ABOUT_HREF) : fillIn(ENTRY_ABOUT_HREF),
		},
		{
			key: "project",
			state: !aboutDone ? "locked" : projectDone ? "done" : "active",
			title: t("checkpointEntry.project.title", "Tell us about your project"),
			line: projectLine(),
			action: !aboutDone
				? undefined
				: projectDone
					? edit(ENTRY_PROJECT_HREF)
					: fillIn(ENTRY_PROJECT_HREF),
		},
		{
			key: "checkpoint",
			state: projectDone ? "active" : "locked",
			title: t("checkpointEntry.checkpoint.title", "Your checkpoint"),
			line: t(
				"checkpointEntry.checkpoint.lineGoal",
				"Set the goal for {days} days and choose a curator.",
				{ days: CHECKPOINT_DAYS },
			),
			action: checkpointAction(),
		},
	];

	return (
		<div className={styles.panel}>
			{items.map((item, index) => (
				<div key={item.key} className={styles.row} data-state={item.state}>
					<ChecklistStatus state={item.state} number={index + 1} />
					<div className={styles.body}>
						<Typography.Text className={styles.title}>
							{item.title}
						</Typography.Text>
						<Typography.Text className={styles.line}>
							{item.line}
						</Typography.Text>
					</div>
					<div className={styles.action}>
						{item.state === "locked" ? (
							<IconLock size={16} className={styles.lock} />
						) : (
							item.action
						)}
					</div>
				</div>
			))}
		</div>
	);
}
