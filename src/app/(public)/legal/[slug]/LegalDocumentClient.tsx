"use client";

import { IconArchive } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { IconTile, StatusDot } from "@/components/ui";
import type { LegalPageData, LegalVersionRow } from "@/lib/legal/pages";
import styles from "./style.module.scss";

const { Text } = Typography;

const day = (date: string) => dayjs(date).format("D MMM YYYY");

export function LegalDocumentClient({ page }: { page: LegalPageData }) {
	const { t } = useTranslate();
	const replacedBy =
		page.status === "archived"
			? page.versions.find((v) => v.version === page.version + 1)
			: undefined;
	const range = (v: LegalVersionRow) =>
		v.status === "scheduled"
			? t("legal.document.takes-effect-short", "Takes effect {date}", {
					date: day(v.effectiveAt),
				})
			: t("legal.document.range", "{from} — {to}", {
					from: day(v.effectiveAt),
					to:
						v.status === "current"
							? t("legal.document.now", "now")
							: day(
									page.versions.find((n) => n.version === v.version + 1)
										?.effectiveAt ?? v.effectiveAt,
								),
				});

	return (
		<>
			<PublicPageHeader
				title={page.title}
				backTo={{ href: "/legal", label: t("legal.index.title", "Legal") }}
				subTitle={
					replacedBy
						? t(
								"legal.document.archived-range",
								"Version {version} · in effect {from} — {to}",
								{
									version: page.version,
									from: day(page.effectiveAt),
									to: day(replacedBy.effectiveAt),
								},
							)
						: page.status === "scheduled"
							? t(
									"legal.document.takes-effect",
									"Version {version} · takes effect {date}",
									{
										version: page.version,
										date: day(page.effectiveAt),
									},
								)
							: t(
									"legal.index.version",
									"Version {version} · in effect since {date}",
									{
										version: page.version,
										date: day(page.effectiveAt),
									},
								)
				}
			/>
			<div className="layout-background">
				<div className={styles.layout}>
					<Flex vertical gap={24} className={styles.main}>
						{replacedBy && (
							<div className={styles.archived}>
								<IconTile icon={IconArchive} size="sm" />
								<Text className={styles.archivedText}>
									{t(
										"legal.document.archived",
										"Archived — replaced by version {version} on {date}",
										{
											version: replacedBy.version,
											date: day(replacedBy.effectiveAt),
										},
									)}
								</Text>
								<Link
									href={`/legal/${page.slug}`}
									className={styles.archivedLink}
								>
									{t("legal.document.read-current", "Read the current version")}
								</Link>
							</div>
						)}
						<LegalDocument text={page.text} />
					</Flex>

					<aside className={styles.aside}>
						<Text className={styles.asideTitle}>
							{t("legal.document.versions", "Versions")}
						</Text>
						<ul className={styles.versions}>
							{[...page.versions].reverse().map((v) => {
								const selected = v.version === page.version;
								return (
									<li key={v.version}>
										<Link
											href={`/legal/${page.slug}/v${v.version}`}
											className={
												selected
													? `${styles.version} ${styles.selected}`
													: styles.version
											}
										>
											<Flex justify="space-between" align="center" gap={8}>
												<span className={styles.versionTitle}>
													{t("legal.document.version", "Version {version}", {
														version: v.version,
													})}
												</span>
												{v.status === "current" && (
													<StatusDot
														tone="success"
														label={t("legal.document.current", "Current")}
														className={styles.current}
													/>
												)}
											</Flex>
											<span className={styles.versionDate}>{range(v)}</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</aside>
				</div>
			</div>
		</>
	);
}
