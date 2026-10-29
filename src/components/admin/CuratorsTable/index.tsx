"use client";

import {
	IconAlertCircle,
	IconArrowUpRight,
	IconRefresh,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Input,
	Popover,
	Segmented,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import {
	EmptyState,
	StatusDot,
	type StatusTone,
	tableStyles as shared,
	skeletonColumns,
	skeletonRows,
	tableScrollX,
} from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CURATOR_NOTE_MAX, CURATOR_NOTE_MIN } from "@/config/checkpoint";
import {
	type CuratorDecisionBody,
	isAlreadyDecided,
	useDecideCurator,
} from "@/hooks/curators";
import type { CuratorStatus } from "@/lib/checkpoints/curator-status";
import type { AdminCuratorRowDto as Row } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** Which list the segmented control shows. */
export type CuratorsSegment = "pending" | "all";

const STATUS_TONE: Record<CuratorStatus, StatusTone> = {
	pending: "warning",
	approved: "success",
	notApproved: "neutral",
};

/** A name's least width before the table scrolls; the card is narrower than 1260 on a laptop. */
const CURATOR_WIDTH = 200;

const day = (date: string | null) => (date ? dayjs(date).format("D MMM") : "");

export type CuratorsTableProps = {
	rows: Row[] | undefined;
	status: "pending" | "error" | "success";
	onRetry: () => void;
	filter: CuratorsSegment;
	onFilterChange: (filter: CuratorsSegment) => void;
	onSearch: (query: string) => void;
	/** How many wait for review, shown on the filter. */
	pendingCount?: number;
	/** Without it the actions are hidden. */
	canManage: boolean;
};

/** Frame 13.7a (`ORPpO`): the experts who asked to curate, with approve / decline / revoke. */
export function CuratorsTable({
	rows,
	status,
	onRetry,
	filter,
	onFilterChange,
	onSearch,
	pendingCount,
	canManage,
}: CuratorsTableProps) {
	const { t } = useTranslate();
	const loading = status === "pending";

	const statusLabels: Record<CuratorStatus, string> = {
		pending: t("admin.curators.status.pending", "Waiting for review"),
		approved: t("admin.curators.status.approved", "Approved"),
		notApproved: t("admin.curators.status.notApproved", "Not approved"),
	};

	const columns: ColumnsType<Row> = [
		{
			title: t("admin.curators.column.curator", "Curator"),
			key: "curator",
			render: (_, row) => {
				const name = (
					<Typography.Text className={styles.name} ellipsis>
						{row.name ?? "—"}
					</Typography.Text>
				);
				return (
					<Flex gap={12} align="center" className={styles.person}>
						<AppAvatar size={32} src={row.image ?? undefined}>
							{row.name?.[0]}
						</AppAvatar>
						{row.specialityId ? (
							<Link
								href={`/expert/${row.specialityId}`}
								target="_blank"
								rel="noreferrer"
								className={styles.profile}
							>
								{name}
								<IconArrowUpRight size={14} className={styles.arrow} />
							</Link>
						) : (
							name
						)}
					</Flex>
				);
			},
		},
		{
			title: t("admin.curators.column.level", "Level"),
			key: "level",
			width: 140,
			render: (_, row) =>
				row.level ? (
					<Tag>{t(row.level, row.level)}</Tag>
				) : (
					<span className={shared.none}>—</span>
				),
		},
		{
			title: t("admin.curators.column.stages", "Stages"),
			key: "stages",
			width: 420,
			render: (_, row) =>
				row.stages.length ? (
					<Typography.Text
						ellipsis={{ tooltip: row.stages.join(", ") }}
						className={styles.stages}
					>
						{row.stages.map((stage) => (
							<Tag key={stage}>{stage}</Tag>
						))}
					</Typography.Text>
				) : (
					<span className={shared.none}>—</span>
				),
		},
		{
			title: t("admin.curators.column.status", "Status"),
			key: "status",
			width: 180,
			render: (_, row) => {
				const sub =
					row.status === "pending"
						? t("admin.curators.since", "since {date}", {
								date: day(row.requestedAt),
							})
						: row.status === "approved"
							? day(row.approvedAt)
							: null;
				return (
					<Flex vertical className={styles.status}>
						<StatusDot
							tone={STATUS_TONE[row.status]}
							label={statusLabels[row.status]}
						/>
						{sub && (
							<Typography.Text type="secondary" className={styles.sub}>
								{sub}
							</Typography.Text>
						)}
					</Flex>
				);
			},
		},
		{
			key: "action",
			width: 200,
			align: "right",
			render: (_, row) => (canManage ? <CuratorActions row={row} /> : null),
		},
	];

	const emptyText =
		status === "error" ? (
			<EmptyState
				size="compact"
				icon={IconAlertCircle}
				tint="var(--gd-danger-tint)"
				ink="var(--gd-danger-on-tint)"
				title={t("admin.curators.error", "Couldn't load curators")}
				action={
					<Button icon={<IconRefresh size={16} />} onClick={onRetry}>
						{t("admin.curators.retry", "Try again")}
					</Button>
				}
			/>
		) : (
			<Typography.Text type="secondary">
				{filter === "pending"
					? t("admin.curators.empty", "Nothing waiting for review")
					: t("admin.curators.emptyAll", "No curators found")}
			</Typography.Text>
		);

	const pendingLabel = t("admin.curators.filter.pending", "Waiting for review");

	return (
		<Flex vertical gap={16}>
			<Flex justify="space-between" align="center" gap={12} wrap>
				<Segmented<CuratorsSegment>
					value={filter}
					onChange={onFilterChange}
					options={[
						{
							value: "pending",
							label: (
								<Flex gap={8} align="center">
									{pendingLabel}
									{!!pendingCount && (
										<span className={styles.count}>{pendingCount}</span>
									)}
								</Flex>
							),
						},
						{
							value: "all",
							label: t("admin.curators.filter.all", "All curators"),
						},
					]}
				/>
				<Input.Search
					allowClear
					className={styles.search}
					placeholder={t("admin.curators.search", "Search by name")}
					onSearch={(value) => onSearch(value.trim())}
				/>
			</Flex>

			<Table<Row>
				className={shared.table}
				rowKey="userId"
				columns={loading ? skeletonColumns(columns) : columns}
				dataSource={
					loading
						? skeletonRows<Row>(4, "userId")
						: status === "error"
							? []
							: rows
				}
				pagination={false}
				scroll={{ x: tableScrollX(columns, CURATOR_WIDTH) }}
				locale={{ emptyText }}
			/>
		</Flex>
	);
}

/** Approve at once; Decline and Revoke ask for a note in a Popover (frame 13.7b, `FRDTR`). */
function CuratorActions({ row }: { row: Row }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const decide = useDecideCurator(row.userId);

	const send = (
		body: CuratorDecisionBody,
		done: string,
		settled?: () => void,
	) =>
		decide.mutate(body, {
			onSuccess: () => message.success(done),
			onError: (error) =>
				isAlreadyDecided(error)
					? message.info(
							t("admin.curators.alreadyDecided", "Already decided — reloaded"),
						)
					: message.error(
							t(
								"admin.curators.decideFailed",
								"That did not go through. Try again.",
							),
						),
			onSettled: settled,
		});

	if (row.status === "pending")
		return (
			<Flex gap={8} justify="flex-end">
				<Button
					size="small"
					loading={decide.isPending && decide.variables?.action === "approve"}
					disabled={decide.isPending}
					onClick={() =>
						send(
							{ action: "approve" },
							t("admin.curators.approved", "Approved"),
						)
					}
				>
					{t("admin.curators.approve", "Approve")}
				</Button>
				<NotePopover
					action="decline"
					name={row.name ?? ""}
					pending={decide.isPending}
					onSubmit={(note, close) =>
						send(
							{ action: "decline", note },
							t("admin.curators.declined", "Declined"),
							close,
						)
					}
				/>
			</Flex>
		);

	if (row.status === "approved")
		return (
			<NotePopover
				action="revoke"
				name={row.name ?? ""}
				pending={decide.isPending}
				onSubmit={(note, close) =>
					send(
						{ action: "revoke", note },
						t("admin.curators.revoked", "Revoked"),
						close,
					)
				}
			/>
		);

	return null;
}

type NotePopoverProps = {
	action: "decline" | "revoke";
	name: string;
	pending?: boolean;
	/** `close` shuts the Popover once the answer is in, whichever way it went. */
	onSubmit: (note: string, close: () => void) => void;
};

function NotePopover({ action, name, pending, onSubmit }: NotePopoverProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState("");
	const valid = note.trim().length >= CURATOR_NOTE_MIN;

	const label =
		action === "decline"
			? t("admin.curators.decline", "Decline")
			: t("admin.curators.revoke", "Revoke");
	const title =
		action === "decline"
			? t("admin.curators.declineTitle", "Decline {name} as a curator?", {
					name,
				})
			: t("admin.curators.revokeTitle", "Revoke {name} as a curator?", {
					name,
				});

	const close = () => {
		setOpen(false);
		setNote("");
	};

	const submit = () => {
		if (valid) onSubmit(note.trim(), close);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => (next ? setOpen(true) : close())}
			trigger="click"
			placement="bottomRight"
			arrow={false}
			classNames={{ container: styles.popover }}
			content={
				<Flex vertical gap={12}>
					<Typography.Text className={styles.popoverTitle}>
						{title}
					</Typography.Text>
					<Input
						autoFocus
						variant="filled"
						size="small"
						maxLength={CURATOR_NOTE_MAX}
						value={note}
						placeholder={t(
							"admin.curators.notePlaceholder",
							"What is wrong — the curator sees it",
						)}
						onChange={(event) => setNote(event.target.value)}
						onPressEnter={submit}
					/>
					<Flex gap={8} justify="flex-end">
						<Button type="text" size="small" onClick={close}>
							{t("common.cancel", "Cancel")}
						</Button>
						<Button
							type="primary"
							danger
							size="small"
							disabled={!valid}
							loading={pending}
							onClick={submit}
						>
							{label}
						</Button>
					</Flex>
				</Flex>
			}
		>
			<Button type="text" danger size="small" disabled={pending}>
				{label}
			</Button>
		</Popover>
	);
}
