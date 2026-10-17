"use client";

import { IconChevronRight, IconFileText } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { IconTile } from "@/components/ui/IconTile";
import type { LegalIndexItem } from "@/lib/legal/pages";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

type Row = {
	key: string;
	href: string;
	title: string;
	version?: string;
	since?: string;
};

export function LegalIndexClient({ items }: { items: LegalIndexItem[] }) {
	const { t } = useTranslate();

	const toRow = (item: LegalIndexItem): Row => ({
		key: item.code,
		href: `/legal/${item.slug}`,
		title: item.title,
		version: t("legal.index.version-number", "Version {version}", {
			version: item.version,
		}),
		since: t("legal.index.since", "in effect since {date}", {
			date: dayjs(item.effectiveAt).format("D MMM YYYY"),
		}),
	});

	const groups: { key: string; title: string; rows: Row[] }[] = [
		{
			key: "platform",
			title: t("legal.index.platform", "Platform"),
			rows: [
				...items.filter((i) => i.group === "platform").map(toRow),
				{
					key: "legal-details",
					href: "/legal-details",
					title: t("legal.index.legal-details", "Legal Details"),
				},
			],
		},
		{
			key: "features",
			title: t("legal.index.features", "Features"),
			rows: items.filter((i) => i.group === "features").map(toRow),
		},
	];

	return (
		<>
			<PublicPageHeader title={t("legal.index.title", "Legal")} />
			<div className="layout-background">
				<Flex vertical gap={32} className={styles.index}>
					{groups.map((group) => (
						<section key={group.key}>
							<Title level={2} className={styles.groupTitle}>
								{group.title}
							</Title>
							{/* antd List is deprecated in v6: the rows are links in an outlined stack. */}
							<div className={styles.list}>
								{group.rows.map((row) => (
									<Link
										key={row.key}
										href={row.href}
										className={styles.rowLink}
									>
										<IconTile icon={IconFileText} size="sm" />
										<Text className={styles.rowTitle}>{row.title}</Text>
										{row.version && (
											<span className={styles.rowMeta}>
												<Text className={styles.rowVersion}>{row.version}</Text>
												<Text className={styles.rowSince}>{row.since}</Text>
											</span>
										)}
										<IconChevronRight size={16} className={styles.chevron} />
									</Link>
								))}
							</div>
						</section>
					))}
				</Flex>
			</div>
		</>
	);
}
