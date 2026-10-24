"use client";

import {
	IconArrowRight,
	IconArrowUpRight,
	IconChevronDown,
	IconCircleDashed,
	IconFileText,
	IconFlag,
	IconHistory,
	IconPackage,
	IconRocket,
	IconUpload,
	IconUserPlus,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Skeleton, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { shortDate } from "./format";
import styles from "./style.module.scss";
import type { CardActivity, CardActivityKind } from "./types";

const { Text } = Typography;

/** Builds carry their own mark; everything else is a document. */
export const fileIcon = (type: string) => {
	if (/build|nda/i.test(type)) return <IconPackage size={16} />;
	if (/video/i.test(type)) return <IconVideo size={16} />;

	return <IconFileText size={16} />;
};

const activityIcon: Record<CardActivityKind, ReactNode> = {
	created: <IconRocket size={16} />,
	devlog: <IconFileText size={16} />,
	step: <IconFlag size={16} />,
	file: <IconUpload size={16} />,
	member: <IconUserPlus size={16} />,
};

export function Person({
	name,
	image,
	caption,
	size = 32,
}: {
	name: string | null;
	image: string | null;
	caption: string | null;
	size?: number;
}) {
	return (
		<Flex align="center" gap={12} className={styles.person}>
			<AppAvatar size={size} src={image}>
				{name?.charAt(0)}
			</AppAvatar>
			<Flex vertical className={styles.person}>
				<Text strong ellipsis>
					{name ?? "—"}
				</Text>
				{caption && (
					<Text type="secondary" ellipsis className={styles.caption}>
						{caption}
					</Text>
				)}
			</Flex>
		</Flex>
	);
}

/**
 * The KYC column.
 *
 * Identity verification is not built yet, so every row reads the same and the
 * tooltip says why. The column ships now rather than later because it is what a
 * scout looks for first: leaving it out reads as "the platform does not check",
 * which is a different claim from "not yet".
 */
export function KycBadge() {
	const { t } = useTranslate();

	return (
		<Tooltip
			title={t(
				"scout.card.kyc.noneHint",
				"Identity verification is coming. Until it ships everyone is shown as unverified.",
			)}
		>
			<span className={styles.kycNone}>
				<IconCircleDashed size={14} />
				{t("scout.card.kyc.none", "Not verified")}
			</span>
		</Tooltip>
	);
}

/** A section that loads on its own, with its own skeleton in its own place. */
export function Section({
	title,
	count,
	action,
	loading,
	rows = 3,
	children,
}: {
	title?: string;
	count?: number;
	action?: ReactNode;
	loading: boolean;
	rows?: number;
	children: ReactNode;
}) {
	return (
		<section className={styles.section}>
			{title && (
				<div className={styles.sectionHead}>
					<Flex align="center" gap={8}>
						<Text className={styles.sectionTitle}>{title}</Text>
						{count !== undefined && (
							<span className={styles.countChip}>{count}</span>
						)}
					</Flex>
					{action}
				</div>
			)}
			{loading ? (
				<Skeleton active title={false} paragraph={{ rows }} />
			) : (
				children
			)}
		</section>
	);
}

/**
 * A digest's way out. Where the card has a tab holding the full list, the link
 * opens it — sending a scout to the public project page for rows that are two
 * clicks away inside the card they already have open is a detour.
 */
export function SectionLink({
	href,
	onClick,
	children,
}: {
	href?: string;
	onClick?: () => void;
	children: ReactNode;
}) {
	const label = (
		<>
			{children}
			<IconArrowRight size={13} />
		</>
	);

	return onClick ? (
		<button type="button" className={styles.sectionLink} onClick={onClick}>
			{label}
		</button>
	) : (
		<a
			className={styles.sectionLink}
			href={href}
			target="_blank"
			rel="noreferrer"
		>
			{label}
		</a>
	);
}

/**
 * The 112-tall stat card: eyebrow, a value, a caption — and the tab that
 * answers it in full. The arrow in the corner was already promising a
 * destination, so the card is a button rather than a decorated box.
 */
export function SummaryCard({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button type="button" className={styles.summaryCard} onClick={onClick}>
			<div className={styles.summaryHead}>
				<Text className={styles.eyebrow}>{label}</Text>
				<IconArrowUpRight size={14} className={styles.summaryGo} />
			</div>
			{children}
		</button>
	);
}

/** One of the tab's three headline figures: eyebrow, number, one line of context. */
export function HeadlineCard({
	label,
	value,
	sub,
	muted,
}: {
	label: string;
	value: string;
	sub: string;
	muted?: boolean;
}) {
	return (
		<div className={styles.headlineCard}>
			<Text className={styles.eyebrow}>{label}</Text>
			<Text className={muted ? styles.headlineMuted : styles.headlineValue}>
				{value}
			</Text>
			<Text className={styles.summarySub}>{sub}</Text>
		</div>
	);
}

/** One line of the log, in the digest's short form or the tab's full one. */
function ActivityRow({
	item,
	detailed,
}: {
	item: CardActivity;
	detailed?: boolean;
}) {
	const { t } = useTranslate();

	// One label formatted, not five: a switch rather than an object keyed by
	// kind, which built every sentence on every row and threw four away.
	const label = (() => {
		switch (item.kind) {
			case "created":
				return t("scout.card.activity.created", "Project registered on GDHub");
			case "devlog":
				return t("scout.card.activity.devlog", "Published a devlog");
			case "step":
				return t("scout.card.activity.step", "Moved to {step}", {
					step: item.subject ?? "",
				});
			case "file":
				return t("scout.card.activity.file", "Uploaded {file}", {
					file: item.subject ?? "",
				});
			default:
				return t("scout.card.activity.member", "{name} joined the team", {
					name: item.subject ?? "",
				});
		}
	})();

	return (
		<div className={styles.feedRow}>
			<span
				className={
					item.kind === "created" ? styles.feedTileOk : styles.feedTile
				}
			>
				{activityIcon[item.kind]}
			</span>
			<div className={styles.feedText}>
				<Text ellipsis className={styles.feedLabel}>
					{label}
				</Text>
				{item.note && (
					<Text type="secondary" className={styles.caption}>
						{item.note}
					</Text>
				)}
				{detailed && item.author && (
					<Text type="secondary" className={styles.caption}>
						{t("scout.card.activity.by", "by {who}", { who: item.author })}
					</Text>
				)}
			</div>
			<Text type="secondary" className={styles.nowrap}>
				{detailed ? dayjs(item.at).format("MMM D · HH:mm") : shortDate(item.at)}
			</Text>
		</div>
	);
}

export function ActivityFeed({
	items,
	detailed,
	onMore,
}: {
	items: CardActivity[];
	detailed?: boolean;
	onMore?: () => void;
}) {
	const { t } = useTranslate();

	if (!items.length) {
		// A whole pane gets the design system's empty state; the digest on
		// Overview is one line inside a section that already has a heading.
		return detailed ? (
			<EmptyState
				icon={IconHistory}
				title={t("scout.card.activity.empty", "Nothing yet")}
				description={t(
					"scout.card.activity.emptyHint",
					"Devlogs, uploads, stage changes and new team members will appear here.",
				)}
			/>
		) : (
			<Text type="secondary">
				{t("scout.card.activity.empty", "Nothing yet")}
			</Text>
		);
	}

	return (
		<div className={styles.feed}>
			{items.map((row) => (
				<ActivityRow key={row.id} item={row} detailed={detailed} />
			))}
			{onMore && (
				<Button type="link" className={styles.feedMore} onClick={onMore}>
					{t("scout.card.activity.more", "See more")}
					<IconChevronDown size={16} />
				</Button>
			)}
		</div>
	);
}
