"use client";

import {
	IconAlertCircle,
	IconCopy,
	IconMail,
	IconRefresh,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import ModernTable from "@/components/ModernTable";
import { EmptyState } from "@/components/ui";
import type { AdminWaitlist } from "@/hooks/feature-waitlist";
import styles from "./style.module.scss";

type Row = AdminWaitlist["rows"][number];

export type WaitlistTableProps = {
	rows: Row[] | undefined;
	/** The rows ticked for a letter. */
	selected: string[];
	onSelect: (ids: string[]) => void;
	/** Without it the checkboxes and Write are hidden. */
	onWrite?: () => void;
	/** Everyone on the list, whatever the search. */
	total: number | undefined;
	status: "pending" | "error" | "success";
	onRetry: () => void;
	onSearch: (query: string) => void;
};

/** Frame 13.8 (`YotIx`): who waits for a checkpoint with an expert. */
export function WaitlistTable({
	rows,
	selected,
	onSelect,
	onWrite,
	total,
	status,
	onRetry,
	onSearch,
}: WaitlistTableProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const loading = status === "pending";

	// One per line, ready to paste into a mail client's To field.
	const copyEmails = () => {
		const chosen = new Set(selected);
		const emails = (rows ?? [])
			.filter((row) => chosen.has(row.id))
			.map((row) => row.email);
		navigator.clipboard.writeText(emails.join("\n")).then(
			() =>
				message.success(
					t(
						"admin.waitlist.copied",
						"{count, plural, one {# email copied} other {# emails copied}}",
						{
							count: emails.length,
						},
					),
				),
			() => message.error(t("admin.waitlist.copyFailed", "Couldn't copy")),
		);
	};

	const columns: ColumnsType<Row> = [
		{
			title: t("admin.waitlist.column.email", "Email"),
			dataIndex: "email",
			key: "email",
		},
		{
			title: t("admin.waitlist.column.joined", "Joined"),
			dataIndex: "createdAt",
			key: "joined",
			width: 200,
			render: (date: string) => (
				<Typography.Text type="secondary">
					{dayjs(date).format("D MMM YYYY")}
				</Typography.Text>
			),
		},
	];

	const emptyText =
		status === "error" ? (
			<EmptyState
				size="compact"
				icon={IconAlertCircle}
				tint="var(--gd-danger-tint)"
				ink="var(--gd-danger-on-tint)"
				title={t("admin.waitlist.error", "Couldn't load the waitlist")}
				action={
					<Button icon={<IconRefresh size={16} />} onClick={onRetry}>
						{t("admin.waitlist.retry", "Try again")}
					</Button>
				}
			/>
		) : (
			<Typography.Text type="secondary">
				{t("admin.waitlist.empty", "Nobody is waiting yet")}
			</Typography.Text>
		);

	return (
		<Flex vertical gap={16}>
			<Flex justify="space-between" align="center" gap={12} wrap>
				<Typography.Text type="secondary">
					{total === undefined
						? ""
						: t(
								"admin.waitlist.count",
								"{count, plural, one {# person asked} other {# people asked}} for a checkpoint with an industry expert",
								{ count: total },
							)}
					{selected.length > 0 &&
						t("admin.waitlist.selected", " · {count} selected", {
							count: selected.length,
						})}
				</Typography.Text>
				<Flex gap={8} align="center">
					<Input.Search
						allowClear
						className={styles.search}
						placeholder={t("admin.waitlist.search", "Search by email")}
						onSearch={(value) => onSearch(value.trim())}
					/>
					{selected.length > 0 && (
						<Button icon={<IconCopy size={16} />} onClick={copyEmails}>
							{t("admin.waitlist.copy", "Copy emails")}
						</Button>
					)}
					{onWrite && (
						<Button
							type="primary"
							icon={<IconMail size={16} />}
							disabled={!total}
							onClick={onWrite}
						>
							{selected.length
								? t("admin.waitlist.writeSome", "Write to {count}", {
										count: selected.length,
									})
								: t("admin.waitlist.writeAll", "Write to all · {count}", {
										count: total ?? 0,
									})}
						</Button>
					)}
				</Flex>
			</Flex>

			<ModernTable<Row>
				rowKey="id"
				columns={columns}
				dataSource={status === "error" ? [] : rows}
				loading={loading}
				pagination={{ pageSize: 50, hideOnSinglePage: true }}
				locale={{ emptyText }}
				rowSelection={
					onWrite
						? {
								selectedRowKeys: selected,
								onChange: (keys) => onSelect(keys as string[]),
							}
						: undefined
				}
			/>
		</Flex>
	);
}
