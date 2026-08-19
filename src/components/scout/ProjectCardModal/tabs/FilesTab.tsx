"use client";

import { IconExternalLink, IconFileText } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Table, Tag, Tooltip, Typography } from "antd";
import { EmptyState } from "@/components/ui/EmptyState";
import { shortDate } from "../format";
import { fileIcon } from "../parts";
import styles from "../style.module.scss";
import type { CardFile } from "../types";
import { useCardSection } from "../useSection";

const { Text } = Typography;

export function FilesTab({ projectId }: { projectId: string }) {
	const { t } = useTranslate();
	const { data, isLoading } = useCardSection<CardFile[]>(projectId, "files");

	if (isLoading)
		return <Skeleton active title={false} paragraph={{ rows: 6 }} />;

	if (!data?.length) {
		return (
			<EmptyState
				icon={IconFileText}
				title={t("scout.card.files.empty", "No files shared yet")}
				description={t(
					"scout.card.files.emptyHint",
					"Builds, concept documents and pitch decks the team shares will appear here.",
				)}
			/>
		);
	}

	return (
		<Table
			rowKey="id"
			size="small"
			pagination={false}
			className={styles.cardTable}
			dataSource={data}
			scroll={{ x: 640 }}
			columns={[
				{
					title: t("scout.card.files.name", "Name"),
					key: "name",
					render: (_: unknown, file: CardFile) => (
						<a
							className={styles.fileRowLink}
							href={file.link}
							target="_blank"
							rel="noreferrer"
						>
							<span className={styles.fileGlyph}>{fileIcon(file.type)}</span>
							<Text ellipsis>{file.name ?? file.type}</Text>
						</a>
					),
				},
				{
					title: t("scout.card.files.type", "Type"),
					dataIndex: "type",
					width: 168,
					render: (type: string) => <Tag>{type}</Tag>,
				},
				{
					title: t("scout.card.files.updated", "Updated"),
					dataIndex: "updatedAt",
					width: 120,
					render: (value: string) => shortDate(value),
				},
				{
					title: "",
					key: "open",
					width: 56,
					align: "right" as const,
					render: (_: unknown, file: CardFile) => (
						<Tooltip title={t("scout.card.files.open", "Open")}>
							<a
								className={styles.openLink}
								href={file.link}
								target="_blank"
								rel="noreferrer"
							>
								<IconExternalLink size={16} />
							</a>
						</Tooltip>
					),
				},
			]}
		/>
	);
}

/** The whole log, oldest page first: 20 rows, then 20 more on demand. */
const ACTIVITY_PAGE = 20;
