"use client";

import {
	type Icon,
	IconBriefcase,
	IconFlag,
	IconNotebook,
	IconPaperclip,
	IconPencil,
	IconSparkles,
	IconUserMinus,
	IconUserPlus,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Spin, Typography } from "antd";
import dayjs from "dayjs";
import { type ReactNode, useEffect, useRef } from "react";
import { IconTile } from "@/components/ui";
import { useProjectActivity } from "@/hooks/checkpoints";
import type {
	ProjectActivity,
	ProjectActivityKind,
} from "@/repositories/project-activity.repository";
import type { CheckpointSprintDto } from "@/types/checkpoints";
import { formatShort } from "./dates";
import styles from "./style.module.scss";

const { Text } = Typography;

/** How close to the bottom, in pixels, the next page starts loading. */
const LOAD_AHEAD = 80;

const TONE: Record<
	ProjectActivityKind,
	{ icon: Icon; tint: string; ink: string }
> = {
	devlog: {
		icon: IconNotebook,
		tint: "var(--gd-info-tint)",
		ink: "var(--gd-info-solid)",
	},
	artifact: {
		icon: IconPaperclip,
		tint: "var(--gd-neutral-100)",
		ink: "var(--gd-color-text-secondary)",
	},
	joined: {
		icon: IconUserPlus,
		tint: "var(--gd-success-tint)",
		ink: "var(--gd-success-solid)",
	},
	left: {
		icon: IconUserMinus,
		tint: "var(--gd-danger-tint)",
		ink: "var(--gd-danger-solid)",
	},
	vacancyOpened: {
		icon: IconBriefcase,
		tint: "var(--gd-neutral-100)",
		ink: "var(--gd-color-text-secondary)",
	},
	vacancyClosed: {
		icon: IconBriefcase,
		tint: "var(--gd-neutral-100)",
		ink: "var(--gd-color-text-tertiary)",
	},
	stage: {
		icon: IconFlag,
		tint: "var(--gd-success-tint)",
		ink: "var(--gd-success-solid)",
	},
	created: {
		icon: IconSparkles,
		tint: "var(--gd-color-accent-subtle)",
		ink: "var(--gd-color-accent)",
	},
	reworded: {
		icon: IconPencil,
		tint: "var(--gd-warning-tint)",
		ink: "var(--gd-warning-solid)",
	},
};

const when = (iso: string) =>
	dayjs(iso).isSame(dayjs(), "day") ? null : formatShort(iso);

export type ActivityFeedProps = {
	projectId: string;
	/** The running checkpoint's sprints: each start is a line across the feed. */
	sprints?: CheckpointSprintDto[];
};

/**
 * Frame 08 (`Dmwhm`): what happened on the project, newest first, with a line
 * where each sprint of the running checkpoint began. Earlier events load as the
 * list is scrolled to its end.
 */
export function ActivityFeed({ projectId, sprints = [] }: ActivityFeedProps) {
	const { t } = useTranslate();
	const scroller = useRef<HTMLDivElement>(null);
	const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useProjectActivity(projectId);
	const events = data?.pages.flatMap((page) => page.events) ?? [];

	const loadMore = () => {
		const el = scroller.current;
		if (!el || !hasNextPage || isFetchingNextPage) return;
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_AHEAD) {
			fetchNextPage();
		}
	};

	// A page too short to scroll would never ask for the next one.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-checked whenever a page lands
	useEffect(loadMore, [events.length, hasNextPage, isFetchingNextPage]);

	const title: Record<ProjectActivityKind, (row: ProjectActivity) => string> = {
		devlog: (row) =>
			t("workflow.activity.devlog", "{name} published a devlog", {
				name: row.actor ?? "",
			}),
		artifact: (row) =>
			t("workflow.activity.artifact", "{name} added an artifact", {
				name: row.actor ?? "",
			}),
		joined: (row) =>
			t("workflow.activity.joined", "{name} joined the team", {
				name: row.actor ?? "",
			}),
		left: (row) =>
			t("workflow.activity.left", "{name} left the team", {
				name: row.actor ?? "",
			}),
		vacancyOpened: (row) =>
			t("workflow.activity.vacancyOpened", "Vacancy opened: {title}", {
				title: row.subject ?? "",
			}),
		vacancyClosed: (row) =>
			t("workflow.activity.vacancyClosed", "Vacancy closed: {title}", {
				title: row.subject ?? "",
			}),
		stage: (row) =>
			t("workflow.activity.stage", "Stage finished: {name}", {
				name: row.subject ?? "",
			}),
		created: (row) =>
			t("workflow.activity.created", "{name} created the project", {
				name: row.actor ?? "",
			}),
		reworded: () =>
			t("workflow.activity.reworded", "Task reworded on the day-14 revision"),
	};

	const sub = (row: ProjectActivity) => {
		if (row.kind === "joined" && row.invitedBy && !row.subject)
			return t("workflow.activity.invitedBy", "Invited by {name}", {
				name: row.invitedBy,
			});
		if (!row.subject) return null;
		if (row.kind === "devlog")
			return t("workflow.activity.devlogNumber", "Devlog {number}", {
				number: row.subject,
			});
		if (row.kind === "reworded" || row.kind === "artifact")
			return `“${row.subject}”`;
		if (row.kind === "joined" && row.invitedBy)
			return t(
				"workflow.activity.joinedInvited",
				"{role} · invited by {name}",
				{ role: row.subject, name: row.invitedBy },
			);
		if (row.kind === "joined" || row.kind === "left") return row.subject;
		return null;
	};

	// Sprint starts already behind us, newest first: each is drawn above the
	// first event older than it.
	const starts = sprints
		.filter((sprint) => dayjs(sprint.from).isBefore(dayjs()))
		.sort((a, b) => b.from.localeCompare(a.from));
	const rows: ReactNode[] = [];
	let next = 0;
	for (const row of events) {
		while (next < starts.length && row.at < starts[next].from) {
			const sprint = starts[next];
			rows.push(
				<div
					key={`sprint-${sprint.number}`}
					className={styles.activityBoundary}
				>
					<span className={styles.activityLine} />
					<span className={styles.activityBoundaryLabel}>
						<IconFlag size={12} />
						{t("workflow.activity.sprint", "Sprint {number} started · {date}", {
							number: String(sprint.number),
							date: formatShort(sprint.from),
						})}
					</span>
					<span className={styles.activityLine} />
				</div>,
			);
			next += 1;
		}

		const tone = TONE[row.kind];
		const date = when(row.at);
		rows.push(
			<div key={row.id} className={styles.activityEvent}>
				<IconTile icon={tone.icon} tint={tone.tint} ink={tone.ink} size="sm" />
				<div className={styles.activityText}>
					<Text className={styles.activityTitle}>{title[row.kind](row)}</Text>
					{sub(row) && (
						<Text type="secondary" className={styles.activitySub}>
							{sub(row)}
						</Text>
					)}
				</div>
				<Text type="secondary" className={styles.activityWhen}>
					{date ??
						t("workflow.activity.today", "Today, {time}", {
							time: dayjs(row.at).format("HH:mm"),
						})}
				</Text>
			</div>,
		);
	}

	return (
		<section className={styles.asideCard}>
			<div className={styles.asideHead}>
				<Text strong className={styles.asideTitle}>
					{t("workflow.activity.title", "Activity")}
				</Text>
			</div>
			<div className={styles.asideBody}>
				{isPending ? (
					<Spin size="small" />
				) : events.length === 0 ? (
					<Text type="secondary">
						{t("workflow.activity.empty", "Nothing has happened here yet.")}
					</Text>
				) : (
					<div
						ref={scroller}
						className={styles.activityList}
						onScroll={loadMore}
					>
						{rows}
						{isFetchingNextPage && (
							<Text type="secondary" className={styles.activityMore}>
								<Spin size="small" />
								{t("workflow.activity.loading", "Loading earlier activity…")}
							</Text>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
