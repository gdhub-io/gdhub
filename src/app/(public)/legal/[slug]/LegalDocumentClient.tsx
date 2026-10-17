"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Tag, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { LegalDocument } from "@/components/legal/LegalDocument";
import type { LegalPageData } from "@/lib/legal/pages";
import styles from "./style.module.scss";

const { Text } = Typography;

const day = (date: string) => dayjs(date).format("D MMM YYYY");

export function LegalDocumentClient({ page }: { page: LegalPageData }) {
	const { t } = useTranslate();
	const replacedBy =
		page.status === "archived"
			? page.versions.find((v) => v.version === page.version + 1)
			: undefined;

	return (
		<>
			<PublicPageHeader
				title={page.title}
				backTo={{ href: "/legal", label: t("legal.index.title", "Legal") }}
				subLine={
					<Text className={styles.subLine}>
						{page.status === "scheduled"
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
								)}
					</Text>
				}
			/>
			<div className="layout-background">
				<div className={styles.layout}>
					<Flex vertical gap={24} className={styles.main}>
						{replacedBy && page.current && (
							<div className={styles.archived}>
								<Text>
									{t(
										"legal.document.archived",
										"Archived — replaced by version {version} on {date}",
										{
											version: replacedBy.version,
											date: day(replacedBy.effectiveAt),
										},
									)}
								</Text>
								<Link href={`/legal/${page.slug}`}>
									{t("legal.document.read-current", "Read the current version")}
								</Link>
							</div>
						)}
						<LegalDocument text={page.text} />
					</Flex>

					<aside className={styles.aside}>
						<Text type="secondary" className={styles.asideTitle}>
							{t("legal.document.versions", "Versions")}
						</Text>
						<ul className={styles.versions}>
							{[...page.versions].reverse().map((v) => (
								<li key={v.version}>
									<Link
										href={`/legal/${page.slug}/v${v.version}`}
										className={
											v.version === page.version
												? `${styles.version} ${styles.selected}`
												: styles.version
										}
									>
										<Flex justify="space-between" align="center" gap={8}>
											<Text strong>
												{t("legal.document.version", "Version {version}", {
													version: v.version,
												})}
											</Text>
											{v.status === "current" && (
												<Tag color="processing">
													{t("legal.document.current", "Current")}
												</Tag>
											)}
										</Flex>
										<Text type="secondary" className={styles.versionDate}>
											{v.status === "scheduled"
												? t(
														"legal.document.takes-effect-short",
														"Takes effect {date}",
														{
															date: day(v.effectiveAt),
														},
													)
												: day(v.effectiveAt)}
										</Text>
									</Link>
								</li>
							))}
						</ul>
					</aside>
				</div>
			</div>
		</>
	);
}
